import { Injectable, Logger } from "@nestjs/common";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService, userPk } from "@ip/dynamo";
import { clampMessages, historySk, HISTORY_TTL_DAYS, type ChatMsg } from "./scope";

/* The saved conversation: one item per user (per session for demo logins) in
   the table the quota counters already live in. No new store — the window is
   six exchanges, a few KB, so it rides along beside CHATUSAGE and CHATSESSION.
   The TTL keeps abandoned conversations from accumulating forever. */
@Injectable()
export class HistoryService {
  private readonly log = new Logger(HistoryService.name);
  constructor(private readonly dyn: DynamoService) {}

  private key(userId: string, sessionId?: string | null) {
    return { pk: userPk(userId), sk: historySk(sessionId) };
  }

  async get(userId: string, sessionId?: string | null): Promise<ChatMsg[]> {
    const r = await this.dyn.doc.send(new GetCommand({
      TableName: this.dyn.chatTable,
      Key: this.key(userId, sessionId),
    }));
    // Clamped on the way out as well as in: an item written by an older build
    // could hold a longer window than the current one replays.
    return clampMessages((r.Item as any)?.messages);
  }

  /* Best-effort on purpose. The user has already spent a quota turn and the
     answer is in hand; failing the request because the transcript could not be
     written would trade something they paid for against something they would
     not miss until their next visit. */
  async save(userId: string, sessionId: string | null | undefined, messages: ChatMsg[]): Promise<void> {
    try {
      await this.dyn.doc.send(new PutCommand({
        TableName: this.dyn.chatTable,
        Item: {
          ...this.key(userId, sessionId),
          messages: clampMessages(messages),
          updatedAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + HISTORY_TTL_DAYS * 86400,
        },
      }));
    } catch (e: any) {
      this.log.warn(`chat history save failed: ${e?.name || e}`);
    }
  }
}
