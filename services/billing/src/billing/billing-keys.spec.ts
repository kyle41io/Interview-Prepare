import { ENTITLEMENT_SK, paymentSk, payStatusPk, parsePaymentCode } from "./billing-keys";
import { userPk } from "@ip/dynamo";

describe("billing-keys", () => {
  it("builds keys", () => {
    expect(userPk("u1")).toBe("USER#u1");
    expect(ENTITLEMENT_SK).toBe("ENTITLEMENT");
    expect(paymentSk("PRO-ABC123")).toBe("PAYMENT#PRO-ABC123");
    expect(payStatusPk("pending")).toBe("PAYSTATUS#pending");
  });

  it("parses the code back out of a payment sk (codes have no '#')", () => {
    expect(parsePaymentCode(paymentSk("PRO-ABC123"))).toBe("PRO-ABC123");
  });
});
