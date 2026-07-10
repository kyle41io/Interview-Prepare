const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function genProCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return "PRO-" + s;
}
export function buildVietqrUrl(bank: string, acct: string, name: string, amount: number, code: string): string {
  return `https://img.vietqr.io/image/${bank}-${acct}-compact2.jpg?amount=${amount}` +
    `&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(name)}`;
}
