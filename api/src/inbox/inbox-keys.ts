export const GMAIL_ACCOUNT_SK = "GMAIL_ACCOUNT";
export const NOTIF_PREFIX = "NOTIF#";
export const REMINDER_PREFIX = "REMINDER#";
export const notifSk = (createdAt: string, id: string) => `${NOTIF_PREFIX}${createdAt}#${id}`;
export const reminderSk = (id: string) => `${REMINDER_PREFIX}${id}`;
export const seenSk = (msgId: string) => `SEEN#${msgId}`;
// SK = NOTIF#<createdAt>#<id>; createdAt is an ISO string containing ':' but NOT '#',
// so split on the FIRST and LAST '#'.
export function parseNotifKey(sk: string): { createdAt: string; id: string } {
  const body = sk.slice(NOTIF_PREFIX.length);
  const i = body.lastIndexOf("#");
  return { createdAt: body.slice(0, i), id: body.slice(i + 1) };
}
