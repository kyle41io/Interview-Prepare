// Provider-flexible AI adapter: Anthropic (claude-haiku-4-5) OR OpenAI (gpt-4o-mini).
// Chosen by AI_PROVIDER secret; falls back to whichever key exists. NEVER uses Fable.
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.65.0";
import OpenAI from "https://esm.sh/openai@4.104.0";

export class AiUnavailable extends Error { code = 503; }

type Msg = { role: "user" | "assistant"; content: string };

export function pickProvider(): "anthropic" | "openai" {
  const explicit = (Deno.env.get("AI_PROVIDER") || "").toLowerCase();
  const hasA = !!Deno.env.get("ANTHROPIC_API_KEY");
  const hasO = !!Deno.env.get("OPENAI_API_KEY");
  if (explicit === "anthropic") { if (!hasA) throw new AiUnavailable("ANTHROPIC_API_KEY missing"); return "anthropic"; }
  if (explicit === "openai") { if (!hasO) throw new AiUnavailable("OPENAI_API_KEY missing"); return "openai"; }
  if (hasA) return "anthropic";
  if (hasO) return "openai";
  throw new AiUnavailable("no AI provider configured");
}

function chatModel(provider: string): string {
  return Deno.env.get("AI_CHAT_MODEL") || (provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5");
}

export async function aiComplete(opts: { system: string; messages: Msg[]; maxTokens?: number }): Promise<{ text: string }> {
  const provider = pickProvider();
  const maxTokens = opts.maxTokens ?? 1024;
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const resp = await client.messages.create({
      model: chatModel(provider), max_tokens: maxTokens,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    });
    const text = (resp.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return { text };
  }
  const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
  const resp = await client.chat.completions.create({
    model: chatModel(provider), max_tokens: maxTokens,
    messages: [{ role: "system", content: opts.system }, ...opts.messages],
  });
  return { text: resp.choices?.[0]?.message?.content || "" };
}

// Used by Phase E (Gmail classify). Structured JSON out.
export async function aiClassify(opts: { system: string; input: string; schema: Record<string, unknown> }): Promise<any> {
  const provider = pickProvider();
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const resp = await client.messages.create({
      model: chatModel(provider), max_tokens: 1024,
      system: [{ type: "text", text: opts.system }],
      messages: [{ role: "user", content: opts.input }],
      output_config: { format: { type: "json_schema", schema: opts.schema } },
    } as any);
    const text = (resp.content || []).find((b: any) => b.type === "text")?.text || "{}";
    return JSON.parse(text);
  }
  const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
  const resp = await client.chat.completions.create({
    model: chatModel(provider), max_tokens: 1024,
    messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.input }],
    response_format: { type: "json_schema", json_schema: { name: "classification", schema: opts.schema, strict: true } },
  } as any);
  return JSON.parse(resp.choices?.[0]?.message?.content || "{}");
}
