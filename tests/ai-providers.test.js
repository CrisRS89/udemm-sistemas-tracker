import test from "node:test";
import assert from "node:assert/strict";
import { requestTutorResponse, validateLocalBaseUrl } from "../src/lib/ai-providers.js";

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
