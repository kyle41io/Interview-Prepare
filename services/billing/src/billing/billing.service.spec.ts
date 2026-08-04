import { BillingService } from "./billing.service";
function svcWith(sends: any[]) {
  let i = 0;
  const doc = { send: jest.fn(async () => sends[i++]) };
  const dyn = { doc, billingTable: "ip_billing" } as any;
  const config = { get: (k: string) => ({ PRICE_VND: 49000, PLAN_DAYS: 30 } as any)[k] } as any;
  return { svc: new BillingService(dyn, config), doc };
}
describe("BillingService.approve", () => {
  it("claims a pending payment then grants/extends the entitlement", async () => {
    // 1) UpdateCommand claim OK; 2) GetCommand entitlement (none); 3) PutCommand entitlement
    const { svc, doc } = svcWith([{}, { Item: undefined }, {}]);
    const out = await svc.approve({ userId: "u1", code: "PRO-1" });
    expect(out.ok).toBe(true);
    expect(typeof out.expires_at).toBe("string");
    expect(doc.send).toHaveBeenCalledTimes(3);
  });
  it("is idempotent when the payment is already approved (claim fails, status already approved)", async () => {
    const err: any = new Error("cond"); err.name = "ConditionalCheckFailedException";
    const doc = { send: jest.fn()
      .mockRejectedValueOnce(err)                              // claim fails
      .mockResolvedValueOnce({ Item: { status: "approved" } }) // re-read: already approved
    };
    const dyn = { doc, billingTable: "ip_billing" } as any;
    const config = { get: (k: string) => ({ PLAN_DAYS: 30 } as any)[k] } as any;
    const out = await new BillingService(dyn, config).approve({ userId: "u1", code: "PRO-1" });
    expect(out.ok).toBe(true);
    expect(doc.send).toHaveBeenCalledTimes(2); // no entitlement write on the idempotent path
  });
});
