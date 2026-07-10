import { ProService } from "./pro.service";
const billing = (isPro: boolean) => ({ getEntitlement: async () => ({ isPro }) }) as any;
describe("ProService", () => {
  it("catalog returns teasers (no section body)", async () => {
    const svc = new ProService(billing(false));
    const cat = await svc.catalog();
    expect(Array.isArray(cat)).toBe(true);
    if (cat.length) { expect(cat[0]).toHaveProperty("title"); expect(cat[0]).not.toHaveProperty("section"); }
  });
  it("content: 403-style null/throw when not Pro, sections when Pro", async () => {
    const topic = require("./content.data").PRO_CONTENT[0]?.topic_id;
    if (!topic) return; // seed empty guard
    await expect(new ProService(billing(false)).sections("nobody", topic)).rejects.toThrow();
    const out = await new ProService(billing(true)).sections("u1", topic);
    expect(Array.isArray(out.sections)).toBe(true);
    expect(out.sections[0]).toHaveProperty("section");
  });
});
