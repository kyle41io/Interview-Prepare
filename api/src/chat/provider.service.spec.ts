import { ProviderService, AiUnavailable } from "./provider.service";
const cfg = (env: Record<string, string | undefined>) => ({ get: (k: string) => env[k] }) as any;
const svc = (env: Record<string, string | undefined>) => new ProviderService(cfg(env));
afterEach(() => { (global as any).fetch = undefined; });

describe("ProviderService.pickProvider", () => {
  it("explicit anthropic needs the key", () => {
    expect(svc({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" }).pickProvider()).toBe("anthropic");
    expect(() => svc({ AI_PROVIDER: "anthropic" }).pickProvider()).toThrow(AiUnavailable);
  });
  it("auto-selects by whichever key exists; none → throws", () => {
    expect(svc({ OPENAI_API_KEY: "k" }).pickProvider()).toBe("openai");
    expect(svc({ ANTHROPIC_API_KEY: "k" }).pickProvider()).toBe("anthropic");
    expect(() => svc({}).pickProvider()).toThrow(AiUnavailable);
  });
  it("mock provider", () => { expect(svc({ AI_PROVIDER: "mock" }).pickProvider()).toBe("mock"); });
});
describe("ProviderService.chatModel", () => {
  it("defaults per provider, AI_CHAT_MODEL overrides", () => {
    expect(svc({}).chatModel("openai")).toBe("gpt-4o-mini");
    expect(svc({}).chatModel("anthropic")).toBe("claude-haiku-4-5");
    expect(svc({ AI_CHAT_MODEL: "x" }).chatModel("anthropic")).toBe("x");
  });
});
describe("ProviderService.complete", () => {
  it("mock returns canned reply from last user message, no network", async () => {
    const out = await svc({ AI_PROVIDER: "mock" }).complete({ system: "s", messages: [{ role: "user", content: "hi" }] });
    expect(out.text).toContain("hi");
    expect((global as any).fetch).toBeUndefined();
  });
  it("anthropic: posts to messages API, parses content[].text", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] }) });
    const out = await svc({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" }).complete({ system: "s", messages: [{ role: "user", content: "hi" }] });
    expect(out.text).toBe("AB");
    const [url, init] = (global as any).fetch.mock.calls[0];
    expect(url).toContain("api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("k");
    expect(JSON.parse(init.body).system).toBe("s");
  });
  it("openai: posts to chat/completions, prepends system, parses choices[0]", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "OK" } }] }) });
    const out = await svc({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }).complete({ system: "s", messages: [{ role: "user", content: "hi" }] });
    expect(out.text).toBe("OK");
    const [url, init] = (global as any).fetch.mock.calls[0];
    expect(url).toContain("api.openai.com/v1/chat/completions");
    expect(JSON.parse(init.body).messages[0]).toEqual({ role: "system", content: "s" });
  });
  it("non-ok response throws", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "err" });
    await expect(svc({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }).complete({ system: "s", messages: [{ role: "user", content: "x" }] })).rejects.toThrow();
  });
});
