import { Injectable } from "@nestjs/common";
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoService } from "../db/dynamo.service";
import { userPk } from "../db/keys";
import { GMAIL_ACCOUNT_SK } from "./inbox-keys";
import { GoogleService } from "./google.service";
@Injectable()
export class GmailAccountService {
  constructor(private readonly dyn: DynamoService, private readonly google: GoogleService) {}
  private t() { return this.dyn.inboxTable; }
  /**
   * Two ways in. The browser gets a Google refresh token directly from Supabase
   * (signInWithOAuth with access_type=offline returns provider_refresh_token),
   * which is the flow assets/js/auth.js uses; passing it here stores it without
   * a second Google round-trip. The `code` path remains for a plain OAuth
   * redirect where only an authorization code is available.
   */
  async connectWithRefreshToken(userId: string, refreshToken: string, email: string | null) {
    await this.store(userId, refreshToken, email ?? null);
    return { connected: true, email: email ?? null };
  }

  async connect(userId: string, code: string, redirectUri: string) {
    const { refresh_token, email } = await this.google.exchangeCode(code, redirectUri);
    await this.store(userId, refresh_token, email);
    return { connected: true, email };
  }

  private async store(userId: string, refresh_token: string, email: string | null) {
    await this.dyn.doc.send(new PutCommand({ TableName: this.t(), Item: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK, refresh_token, email, active: true, last_scan: null, updated_at: new Date().toISOString() } }));
  }
  async getAccount(userId: string) {
    const r = await this.dyn.doc.send(new GetCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK } }));
    return (r.Item as any) || null;
  }
  async status(userId: string) {
    const a = await this.getAccount(userId);
    return { connected: !!a && a.active === true, email: a?.email ?? null, last_scan: a?.last_scan ?? null };
  }
  async disconnect(userId: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK }, UpdateExpression: "SET active = :f, refresh_token = :e", ExpressionAttributeValues: { ":f": false, ":e": "" } }));
    return { connected: false };
  }
  // Scan (T4) uses these — Scan is acceptable: the account count is small.
  async listActiveAccounts(): Promise<Array<{ userId: string; refresh_token: string; email: string | null }>> {
    const r = await this.dyn.doc.send(new ScanCommand({ TableName: this.t(), FilterExpression: "sk = :s AND active = :t", ExpressionAttributeValues: { ":s": GMAIL_ACCOUNT_SK, ":t": true } }));
    return ((r.Items || []) as any[]).map((it) => ({ userId: String(it.pk).replace(/^USER#/, ""), refresh_token: it.refresh_token, email: it.email ?? null }));
  }
  async setLastScan(userId: string) {
    await this.dyn.doc.send(new UpdateCommand({ TableName: this.t(), Key: { pk: userPk(userId), sk: GMAIL_ACCOUNT_SK }, UpdateExpression: "SET last_scan = :n", ExpressionAttributeValues: { ":n": new Date().toISOString() } }));
  }
}
