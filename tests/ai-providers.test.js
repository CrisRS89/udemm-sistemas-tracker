import test from "node:test";
import assert from "node:assert/strict";
import { fetchProviderModels, requestTutorResponse, validateLocalBaseUrl } from "../src/lib/ai-providers.js";

test("validates local HTTP(S) base URLs and removes trailing slash", () => {
  assert.equal(validateLocalBaseUrl("http://localhost:11434/v1/"), "http://localhost:11434/v1");
  assert.equal(validateLocalBaseUrl("https://ai.example/v1"), "https://ai.example/v1");
  assert.throws(() => validateLocalBaseUrl("javascript:alert(1)"));
  assert.throws(() => validateLocalBaseUrl("http://user:pass@localhost/v1"));
});

test("calls a local OpenAI-compatible server without requiring a key", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { content: "Respuesta local" } }] }) };
  };
  try {
    const text = await requestTutorResponse({
      provider: "local", model: "llama3.2", apiKey: "", prompt: "Hola",
      localBaseUrl: "http://localhost:11434/v1/",
    });
    assert.equal(text, "Respuesta local");
    assert.equal(request.url, "http://localhost:11434/v1/chat/completions");
    assert.equal(request.options.headers.Authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loads provider-specific chat models with the user's API key", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const data = url.includes("generativelanguage")
      ? { models: [{ name: "models/gemini-chat", displayName: "Gemini Chat", supportedGenerationMethods: ["generateContent"] }, { name: "models/embedder", supportedGenerationMethods: ["embedContent"] }] }
      : url.includes("anthropic")
        ? { data: [{ id: "claude-chat", display_name: "Claude Chat" }] }
        : url.includes("deepseek")
          ? { data: [{ id: "deepseek-chat", name: "DeepSeek Chat", output_modalities: ["text"] }] }
          : url.includes("openrouter")
            ? { data: [{ id: "org/model", name: "Router Chat", architecture: { output_modalities: ["text"] } }] }
            : { data: [{ id: "gpt-chat", name: "GPT Chat" }, { id: "text-embedding-3-small" }] };
    return { ok: true, status: 200, json: async () => data };
  };
  try {
    for (const provider of ["openai", "anthropic", "gemini", "deepseek", "openrouter"]) {
      const models = await fetchProviderModels({ provider, apiKey: "test-key-123" });
      assert.equal(models.length, 1, provider);
      assert.ok(calls.at(-1).options.headers.Authorization || calls.at(-1).options.headers["x-api-key"] || calls.at(-1).options.headers["x-goog-api-key"]);
    }
    assert.equal(calls[0].url, "https://api.openai.com/v1/models");
    assert.equal(calls[1].url, "https://api.anthropic.com/v1/models?limit=1000");
    assert.equal(calls[2].url, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000");
    assert.equal(calls[3].url, "https://api.deepseek.com/models");
    assert.equal(calls[4].url, "https://openrouter.ai/api/v1/models?output_modalities=text");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("connection test gives a clear error for a rejected API key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  try {
    await assert.rejects(
      fetchProviderModels({ provider: "openai", apiKey: "bad-key" }),
      /rechazó la API key/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discovers models from Ollama or LM Studio compatible /models endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl;
  globalThis.fetch = async (url) => {
    calledUrl = url;
    return { ok: true, status: 200, json: async () => ({ data: [{ id: "qwen-local", name: "Qwen local" }] }) };
  };
  try {
    const models = await fetchProviderModels({ provider: "local", apiKey: "", localBaseUrl: "http://localhost:1234/v1" });
    assert.equal(calledUrl, "http://localhost:1234/v1/models");
    assert.equal(models[0].id, "qwen-local");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
