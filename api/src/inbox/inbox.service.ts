import { Injectable } from "@nestjs/common";
import { QueryCommand, UpdateCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { notifSk, reminderSk, NOTIF_PREFIX, REMINDER_PREFIX, parseNotifKey } from "./inbox-keys";

function rid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Injectable()
export class InboxService {
  constructor(private readonly dyn: DynamoService) {}
  private t() {
    return this.dyn.inboxTable;
  }

  async listNotifications(userId: string, limit = 30) {
    const r = await this.dyn.doc.send(
      new QueryCommand({
        TableName: this.t(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
        ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": NOTIF_PREFIX },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return ((r.Items || []) as any[]).map((it) => ({
      id: it.id,
      type: it.type,
      title: it.title,
      body: it.body,
      read: !!it.read,
      source: it.source,
      created_at: it.created_at,
    }));
  }

  async addNotification(userId: string, n: { type: string; title: string; body: string; source: string }) {
    const created_at = new Date().toISOString();
    const id = rid();
    await this.dyn.doc.send(
      new PutCommand({
        TableName: this.t(),
        Item: { pk: userPk(userId), sk: notifSk(created_at, id), id, type: n.type, title: n.title, body: n.body, read: false, source: n.source, created_at },
      }),
    );
    return { id, created_at };
  }

  async markRead(userId: string, createdAt: string, id: string) {
    try {
      await this.dyn.doc.send(
        new UpdateCommand({
          TableName: this.t(),
          Key: { pk: userPk(userId), sk: notifSk(createdAt, id) },
          UpdateExpression: "SET #r = :t",
          ConditionExpression: "attribute_exists(sk)", // only update an existing notification — never create a garbage row
          ExpressionAttributeNames: { "#r": "read" },
          ExpressionAttributeValues: { ":t": true },
        }),
      );
      return { ok: true };
    } catch (e: any) {
      if (e.name === "ConditionalCheckFailedException") return { ok: false }; // no such notification (no-op)
      throw e;
    }
  }

  async markAllRead(userId: string) {
    const r = await this.dyn.doc.send(
      new QueryCommand({
        TableName: this.t(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
        ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": NOTIF_PREFIX },
      }),
    );
    let n = 0;
    for (const it of (r.Items || []) as any[]) {
      if (it.read) continue;
      const { createdAt, id } = parseNotifKey(it.sk);
      await this.markRead(userId, createdAt, id);
      n++;
    }
    return { ok: true, updated: n };
  }

  /** `status` is a comma-separated set, not one value: the reminders page asks
   *  for "upcoming,done" — the shape of the Supabase `.in("status", [...])`
   *  query this replaced. Comparing the raw parameter against a single status
   *  matched nothing, so the page rendered empty however many reminders existed.
   *  An empty/blank set means "no filter". */
  async listReminders(userId: string, status = "upcoming") {
    const wanted = new Set(
      String(status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const r = await this.dyn.doc.send(
      new QueryCommand({
        TableName: this.t(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
        ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": REMINDER_PREFIX },
      }),
    );
    return ((r.Items || []) as any[])
      .filter((it) => wanted.size === 0 || wanted.has(it.status))
      .map((it) => ({ id: it.id, kind: it.kind, title: it.title, company: it.company, due_at: it.due_at, deadline_at: it.deadline_at, status: it.status, source: it.source }))
      .sort((a, b) => String(a.due_at || "").localeCompare(String(b.due_at || "")));
  }

  async addReminder(userId: string, r: { kind: string; title: string; company?: string; due_at?: string; deadline_at?: string; source: string }) {
    const id = rid();
    await this.dyn.doc.send(
      new PutCommand({
        TableName: this.t(),
        Item: { pk: userPk(userId), sk: reminderSk(id), id, kind: r.kind, title: r.title, company: r.company ?? null, due_at: r.due_at ?? null, deadline_at: r.deadline_at ?? null, status: "upcoming", source: r.source, created_at: new Date().toISOString() },
      }),
    );
    return { id };
  }

  /** Delete is unconditional: removing an already-absent reminder is a no-op,
   *  and the key is scoped to the caller's own pk so one user cannot delete
   *  another's row. */
  async deleteReminder(userId: string, id: string) {
    await this.dyn.doc.send(
      new DeleteCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: reminderSk(id) } }),
    );
    return { ok: true };
  }

  /** Clears notifications the user has already read, leaving unread ones. */
  async clearReadNotifications(userId: string) {
    const r = await this.dyn.doc.send(
      new QueryCommand({
        TableName: this.t(),
        KeyConditionExpression: "pk = :p AND begins_with(sk, :pfx)",
        ExpressionAttributeValues: { ":p": userPk(userId), ":pfx": NOTIF_PREFIX },
      }),
    );
    let n = 0;
    for (const it of (r.Items || []) as any[]) {
      if (!it.read) continue;
      await this.dyn.doc.send(
        new DeleteCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: it.sk } }),
      );
      n++;
    }
    return { ok: true, deleted: n };
  }

  async setReminderStatus(userId: string, id: string, status: string) {
    try {
      await this.dyn.doc.send(
        new UpdateCommand({
          TableName: this.t(),
          Key: { pk: userPk(userId), sk: reminderSk(id) },
          UpdateExpression: "SET #s = :s",
          ConditionExpression: "attribute_exists(sk)", // only update an existing reminder — never create a stub
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": status },
        }),
      );
      return { ok: true };
    } catch (e: any) {
      if (e.name === "ConditionalCheckFailedException") return { ok: false };
      throw e;
    }
  }
}
