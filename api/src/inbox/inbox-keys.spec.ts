import { GMAIL_ACCOUNT_SK, notifSk, reminderSk, seenSk, NOTIF_PREFIX, parseNotifKey } from "./inbox-keys";
import { userPk } from "../db/keys";
describe("inbox-keys", () => {
  it("builds keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(GMAIL_ACCOUNT_SK).toBe("GMAIL_ACCOUNT");
    expect(notifSk("2026-07-10T00:00:00.000Z", "n1")).toBe("NOTIF#2026-07-10T00:00:00.000Z#n1");
    expect(reminderSk("r1")).toBe("REMINDER#r1");
    expect(seenSk("m1")).toBe("SEEN#m1");
    expect(NOTIF_PREFIX).toBe("NOTIF#");
  });
  it("parseNotifKey splits createdAt + id (id may be a uuid, createdAt has colons)", () => {
    expect(parseNotifKey("NOTIF#2026-07-10T00:00:00.000Z#n1")).toEqual({ createdAt: "2026-07-10T00:00:00.000Z", id: "n1" });
  });
});
