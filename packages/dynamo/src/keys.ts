export type EntityType = "TOPIC" | "CARD" | "QUIZ" | "BOOK" | "STREAK" | "SETTINGS";

export const STREAK_SK = "STREAK";
export const SETTINGS_SK = "SETTINGS";

export const userPk = (userId: string) => `USER#${userId}`;
export const topicSk = (id: string) => `TOPIC#${id}`;
export const cardSk = (key: string) => `CARD#${key}`;
export const quizSk = (id: string) => `QUIZ#${id}`;
export const bookSk = (id: string) => `BOOK#${id}`;

export function parseSk(sk: string): { type: EntityType; id: string } {
  if (sk === STREAK_SK) return { type: "STREAK", id: "" };
  if (sk === SETTINGS_SK) return { type: "SETTINGS", id: "" };
  const i = sk.indexOf("#");
  return { type: sk.slice(0, i) as EntityType, id: sk.slice(i + 1) };
}
