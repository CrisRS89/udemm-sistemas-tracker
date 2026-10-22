const PROVIDER_ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  deepseek: "https://api.deepseek.com/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export async function requestTutorResponse({ provider, model, apiKey, prompt, localBaseUrl }) {
  let url;
  let headers = { "Content-Type": "application/json" };
  let body;

  if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers["x-goog-api-key"] = apiKey;
    body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1200, temperature: 0.6 } };
  } else if (provider === "anthropic") {
    url = PROVIDER_ENDPOINTS.anthropic;
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
    body = { model, max_tokens: 1200, temperature: 0.6, messages: [{ role: "user", content: prompt }] };
  } else {
    const local = provider === "local";
    const base = local ? validateLocalBaseUrl(localBaseUrl) : "";
    url = local ? `${base}/chat/completions` : PROVIDER_ENDPOINTS[provider];
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    body = { model, max_tokens: 1200, temperature: 0.6, messages: [{ role: "user", content: prompt }] };
    if (provider === "openai") {
      delete body.max_tokens;
      body.max_completion_tokens = 1200;
      if (/^o\d/.test(model)) delete body.temperature;
    }
  }

  if (!url || !model?.trim() || (provider !== "local" && !apiKey?.trim())) {
    throw new Error("Completá el modelo y, para proveedores en la nube, tu API key.");
  }

  let response;
  try {
    response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new Error("No se pudo conectar. Revisá la URL, que el servidor local esté activo y que permita CORS desde esta app.");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("El proveedor rechazó la API key o los permisos.");
    if (response.status === 429) throw new Error("El proveedor alcanzó un límite de uso.");
    throw new Error(`El proveedor respondió con error HTTP ${response.status}. Revisá el modelo y la configuración.`);
  }
  const data = await response.json();
  const text = provider === "gemini"
    ? data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim()
    : provider === "anthropic"
      ? data?.content?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n").trim()
      : data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("El proveedor devolvió una respuesta vacía.");
  return text;
}

export function validateLocalBaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Ingresá una URL base válida, por ejemplo http://localhost:11434/v1."); }
  if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("La URL local debe usar HTTP(S), sin usuario, contraseña, parámetros ni fragmento.");
  }
  return url.toString().replace(/\/$/, "");
}

export async function fetchProviderModels({ provider, apiKey, localBaseUrl }) {
  let url;
  const headers = {};

  if (provider === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
    headers["x-goog-api-key"] = apiKey;
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models?limit=1000";
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/models";
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (provider === "deepseek") {
    url = "https://api.deepseek.com/models";
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (provider === "openrouter") {
    url = "https://openrouter.ai/api/v1/models?output_modalities=text";
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (provider === "local") {
    url = `${validateLocalBaseUrl(localBaseUrl)}/models`;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  } else {
    throw new Error("Proveedor desconocido.");
  }

  if (provider !== "local" && !apiKey?.trim()) {
    throw new Error("Ingresá tu API key antes de probar la conexión.");
  }

  let response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error("No se pudo conectar. Revisá la API key o URL y que el proveedor permita CORS desde esta app.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("El proveedor rechazó la API key o no tiene permiso para listar modelos.");
  }
  if (response.status === 429) throw new Error("El proveedor limitó la consulta. Esperá un momento y volvé a probar.");
  if (!response.ok) throw new Error(`El proveedor devolvió HTTP ${response.status} al consultar modelos.`);

  const data = await response.json();
  let models;
  if (provider === "gemini") {
    models = (data.models || [])
      .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => ({ id: model.name?.replace(/^models\//, ""), name: model.displayName || model.name }));
  } else {
    const entries = Array.isArray(data.data) ? data.data : [];
    models = entries
      .filter((model) => typeof model.id === "string")
      .filter((model) => provider !== "openrouter" || !model.architecture?.output_modalities || model.architecture.output_modalities.includes("text"))
      .filter((model) => provider !== "deepseek" || !model.output_modalities || model.output_modalities.includes("text"))
      .filter((model) => provider !== "openai" || !/(embed|whisper|transcri|moderation|dall-e|sora|realtime|audio|tts|image)/i.test(model.id))
      .map((model) => ({ id: model.id, name: model.display_name || model.name || model.id }));
  }

  const unique = [...new Map(models.filter((model) => model.id).map((model) => [model.id, model])).values()];
  if (!unique.length) throw new Error("La conexión respondió, pero no devolvió modelos utilizables para chat.");
  return unique.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 1000);
}
