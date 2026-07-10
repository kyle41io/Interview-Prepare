import { Injectable } from "@nestjs/common";
import { QueryCommand, GetCommand, PutCommand, DeleteCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk, topicSk, cardSk, quizSk, bookSk, STREAK_SK, SETTINGS_SK, parseSk } from "../db/keys";
import { mergeSnapshot, Snapshot } from "./merge";
import { FlashcardDto, StreakDto, SettingsDto } from "./dto";

function toSnapshot(items: any[]): Snapshot {
  const snap: Snapshot = { topics: {}, cards: {}, quizBest: {}, bookmarks: [], streak: null, settings: {} };
  for (const item of items) {
    const { type, id } = parseSk(item.sk);
    switch (type) {
      case "TOPIC":
        snap.topics[id] = true;
        break;
      case "CARD":
        snap.cards[id] = {
          due_at: item.due_at ?? null,
          interval: item.interval,
          ease: item.ease,
          reps: item.reps,
        };
        break;
      case "QUIZ":
        snap.quizBest[id] = item.best_pct;
        break;
      case "BOOK":
        snap.bookmarks.push(id);
        break;
      case "STREAK":
        snap.streak = { current: item.current, longest: item.longest, last_day: item.last_day ?? null };
        break;
      case "SETTINGS": {
        const s: NonNullable<Snapshot["settings"]> = {};
        if (item.lang !== undefined) s.lang = item.lang;
        if (item.theme !== undefined) s.theme = item.theme;
        if (item.track_role !== undefined) s.track_role = item.track_role;
        if (item.track_level !== undefined) s.track_level = item.track_level;
        snap.settings = s;
        break;
      }
    }
  }
  return snap;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

@Injectable()
export class ProgressService {
  constructor(private readonly dyn: DynamoService) {}

  async getSnapshot(userId: string): Promise<Snapshot> {
    const items: any[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;
    do {
      const res = await this.dyn.doc.send(
        new QueryCommand({
          TableName: this.dyn.table,
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": userPk(userId) },
          ExclusiveStartKey,
        }),
      );
      items.push(...(res.Items || []));
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return toSnapshot(items);
  }

  async sync(userId: string, local: Snapshot): Promise<Snapshot> {
    const server = await this.getSnapshot(userId);
    const merged = mergeSnapshot(server, local);
    const pk = userPk(userId);
    const now = new Date().toISOString();

    const items: any[] = [];
    for (const id of Object.keys(merged.topics)) {
      items.push({ pk, sk: topicSk(id), status: "learned", learned_at: now, updated_at: now });
    }
    for (const [key, card] of Object.entries(merged.cards)) {
      items.push({ pk, sk: cardSk(key), due_at: card.due_at, interval: card.interval, ease: card.ease, reps: card.reps, updated_at: now });
    }
    for (const [id, pct] of Object.entries(merged.quizBest)) {
      items.push({ pk, sk: quizSk(id), best_pct: pct, updated_at: now });
    }
    for (const id of merged.bookmarks) {
      items.push({ pk, sk: bookSk(id), created_at: now });
    }
    if (merged.streak) {
      items.push({ pk, sk: STREAK_SK, current: merged.streak.current, longest: merged.streak.longest, last_day: merged.streak.last_day, updated_at: now });
    }
    if (merged.settings && Object.keys(merged.settings).length) {
      items.push({ pk, sk: SETTINGS_SK, ...merged.settings, updated_at: now });
    }

    for (const batch of chunk(items, 25)) {
      await this.dyn.doc.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.dyn.table]: batch.map((Item) => ({ PutRequest: { Item } })),
          },
        }),
      );
    }

    return merged;
  }

  async setTopic(userId: string, id: string, learned: boolean) {
    const pk = userPk(userId);
    const sk = topicSk(id);
    const now = new Date().toISOString();
    if (learned) {
      await this.dyn.doc.send(
        new PutCommand({ TableName: this.dyn.table, Item: { pk, sk, status: "learned", learned_at: now, updated_at: now } }),
      );
      return { learned: true, learned_at: now };
    }
    await this.dyn.doc.send(new DeleteCommand({ TableName: this.dyn.table, Key: { pk, sk } }));
    return { learned: false };
  }

  async setFlashcard(userId: string, key: string, dto: FlashcardDto) {
    const pk = userPk(userId);
    const now = new Date().toISOString();
    const item = {
      pk,
      sk: cardSk(key),
      due_at: dto.due_at ?? null,
      interval: dto.interval,
      ease: dto.ease,
      reps: dto.reps,
      updated_at: now,
    };
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.table, Item: item }));
    return { due_at: item.due_at, interval: item.interval, ease: item.ease, reps: item.reps };
  }

  async setQuiz(userId: string, id: string, pct: number) {
    const pk = userPk(userId);
    const sk = quizSk(id);
    const existing = await this.dyn.doc.send(new GetCommand({ TableName: this.dyn.table, Key: { pk, sk } }));
    const prevBest = existing.Item?.best_pct ?? 0;
    const prevAttempts = existing.Item?.attempts ?? 0;
    const best_pct = Math.max(prevBest, pct);
    const attempts = prevAttempts + 1;
    const now = new Date().toISOString();
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.table, Item: { pk, sk, best_pct, attempts, updated_at: now } }));
    return { best_pct, attempts };
  }

  async setBookmark(userId: string, id: string, on: boolean) {
    const pk = userPk(userId);
    const sk = bookSk(id);
    if (on) {
      const now = new Date().toISOString();
      await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.table, Item: { pk, sk, created_at: now } }));
      return { on: true };
    }
    await this.dyn.doc.send(new DeleteCommand({ TableName: this.dyn.table, Key: { pk, sk } }));
    return { on: false };
  }

  async setStreak(userId: string, dto: StreakDto) {
    const pk = userPk(userId);
    const now = new Date().toISOString();
    const item = { pk, sk: STREAK_SK, current: dto.current, longest: dto.longest, last_day: dto.last_day ?? null, updated_at: now };
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.table, Item: item }));
    return { current: item.current, longest: item.longest, last_day: item.last_day };
  }

  async setSettings(userId: string, dto: SettingsDto) {
    const pk = userPk(userId);
    const now = new Date().toISOString();
    const item = {
      pk,
      sk: SETTINGS_SK,
      lang: dto.lang,
      theme: dto.theme,
      track_role: dto.track_role,
      track_level: dto.track_level,
      updated_at: now,
    };
    await this.dyn.doc.send(new PutCommand({ TableName: this.dyn.table, Item: item }));
    return { lang: dto.lang, theme: dto.theme, track_role: dto.track_role, track_level: dto.track_level };
  }
}
