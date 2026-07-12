import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatMsg } from "./scope";
export class AiUnavailable extends Error {}
@Injectable()
export class ProviderService {
  constructor(private readonly config: ConfigService) {}
  pickProvider(): "anthropic" | "openai" | "mock" {
    const explicit = (this.config.get<string>("AI_PROVIDER") || "").toLowerCase();
    if (explicit === "mock") return "mock";
    const hasA = !!this.config.get<string>("ANTHROPIC_API_KEY");
    const hasO = !!this.config.get<string>("OPENAI_API_KEY");
    if (explicit === "anthropic") { if (!hasA) throw new AiUnavailable("ANTHROPIC_API_KEY missing"); return "anthropic"; }
    if (explicit === "openai") { if (!hasO) throw new AiUnavailable("OPENAI_API_KEY missing"); return "openai"; }
    if (hasA) return "anthropic";
    if (hasO) return "openai";
    throw new AiUnavailable("no AI provider configured");
  }
  chatModel(provider: string): string {
    return this.config.get<string>("AI_CHAT_MODEL") || (provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5");
  }
  // Structured classification. The caller supplies the full system prompt (incl. the
  // JSON instruction), so this stays layer-agnostic. Mock → canned recruiting object;
  // a parse failure → { is_recruiting: false } so a bad model reply never crashes a scan.
  async classify(opts: { system: string; input: string }): Promise<any> {
    if (this.pickProvider() === "mock") {
      return { is_recruiting: true, kind: "interview", company: "Acme", title: "Interview invite", event_at: null, deadline_at: null, summary: "[mock] interview" };
    }
    const { text } = await this.complete({ system: opts.system, messages: [{ role: "user", content: opts.input }], maxTokens: 512 });
    try {
      return JSON.parse(text.replace(/^```(json)?/i, "").replace(/```$/, "").trim());
    } catch {
      return { is_recruiting: false };
    }
  }

  async complete(opts: { system: string; messages: ChatMsg[]; maxTokens?: number }): Promise<{ text: string }> {
    const provider = this.pickProvider();
    const maxTokens = opts.maxTokens ?? 1024;
    if (provider === "mock") {
      const last = [...opts.messages].reverse().find((m) => m.role === "user");
      return { text: "[mock] " + (last?.content || "") };
    }
    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": this.config.get<string>("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: this.chatModel(provider), max_tokens: maxTokens, system: opts.system, messages: opts.messages }),
      });
      if (!resp.ok) throw new Error(`anthropic ${resp.status} ${await resp.text()}`);
      const data: any = await resp.json();
      const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      return { text };
    }
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.get<string>("OPENAI_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.chatModel(provider), max_tokens: maxTokens, messages: [{ role: "system", content: opts.system }, ...opts.messages] }),
    });
    if (!resp.ok) throw new Error(`openai ${resp.status} ${await resp.text()}`);
    const data: any = await resp.json();
    return { text: data.choices?.[0]?.message?.content || "" };
  }
}
