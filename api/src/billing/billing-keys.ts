export const ENTITLEMENT_SK = "ENTITLEMENT";
export const paymentSk = (code: string) => `PAYMENT#${code}`;
export const payStatusPk = (status: string) => `PAYSTATUS#${status}`;
export function parsePaymentCode(sk: string): string {
  return sk.startsWith("PAYMENT#") ? sk.slice("PAYMENT#".length) : sk;
}
