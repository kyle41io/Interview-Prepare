import { HistoryService } from "./history.service";
import { historySk, MAX_MESSAGES } from "./scope";

function svc(send: jest.Mock) {
  const dyn = { doc: { send }, chatTable: "ip_chat" } as any;
  return new HistoryService(dyn);
}
const turn = (i: number) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "m" + i });

describe("HistoryService.get", () => {
  it("reads the item under the user's own key and clamps what it finds", async () => {
    const stored = Array.from({ length: 30 }, (_, i) => turn(i));
    const send = jest.fn().mockResolvedValue({ Item: { messages: stored } });
    const out = await svc(send).get("u1");
    expect(out.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(out[0].role).toBe("user");
    expect(send.mock.calls[0][0].input.Key).toEqual({ pk: "USER#u1", sk: "CHATHISTORY" });
  });
  it("no item → empty conversation", async () => {
    expect(await svc(jest.fn().mockResolvedValue({})).get("u1")).toEqual([]);
  });
  it("a demo visitor reads their own session, not the shared login's", async () => {
    const send = jest.fn().mockResolvedValue({});
    await svc(send).get("demo", "sess-9");
    expect(send.mock.calls[0][0].input.Key.sk).toBe(historySk("sess-9"));
    expect(send.mock.calls[0][0].input.Key.sk).not.toBe("CHATHISTORY");
  });
});

describe("HistoryService.save", () => {
  it("writes the clamped window with a ttl", async () => {
    const send = jest.fn().mockResolvedValue({});
    await svc(send).save("u1", null, Array.from({ length: 30 }, (_, i) => turn(i)) as any);
    const item = send.mock.calls[0][0].input.Item;
    expect(item.pk).toBe("USER#u1");
    expect(item.sk).toBe("CHATHISTORY");
    expect(item.messages.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(item.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(typeof item.updatedAt).toBe("string");
  });
  it("swallows a write failure — the answer is already in the user's hands", async () => {
    const send = jest.fn().mockRejectedValue(new Error("throughput"));
    await expect(svc(send).save("u1", null, [{ role: "user", content: "q" }])).resolves.toBeUndefined();
  });
});
