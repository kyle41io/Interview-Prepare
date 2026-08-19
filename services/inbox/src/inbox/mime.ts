/* Pulling readable text out of a Gmail message payload.
   Kept pure and separate from GoogleService so the part-walking — the fiddly
   half — is unit-testable without a Gmail account. */

/** Gmail encodes part bodies as base64url. Never throws: a body that will not
 *  decode costs the classifier some context, not the whole scan. */
export function decodeB64Url(data?: string | null): string {
  if (!data) return "";
  try {
    return Buffer.from(String(data), "base64url").toString("utf8");
  } catch {
    return "";
  }
}

// Only the entities that actually turn up in recruiting mail; anything else
// becomes a space, which costs nothing the classifier needs.
const NAMED: Record<string, string> = {
  "&ograve;": "ò", "&oacute;": "ó", "&agrave;": "à", "&aacute;": "á",
  "&egrave;": "è", "&eacute;": "é", "&igrave;": "ì", "&iacute;": "í",
  "&ugrave;": "ù", "&uacute;": "ú", "&ndash;": "-", "&mdash;": "—",
  "&hellip;": "…", "&apos;": "'", "&middot;": "·",
};

function stripHtml(html: string): string {
  return html
    // Script and style hold no prose but plenty of tokens.
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => NAMED[m.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Part {
  mimeType?: string;
  filename?: string;
  // attachmentId instead of data is Gmail saying "fetch this separately" — the
  // reason attachments cost the walk nothing.
  body?: { data?: string | null; attachmentId?: string; size?: number };
  parts?: Part[];
}

/** Depth-first search for readable text, text/plain preferred over text/html.
 *  Attachments are skipped: Gmail returns those as attachmentId references
 *  rather than inline data, and a filename means the part is a file, not prose.
 *
 *  Capped because the classifier is billed per token and an interview time is
 *  never below a footer full of legal boilerplate.
 */
export function extractBody(payload?: Part | null, maxChars = 4000): string {
  if (!payload) return "";
  const found: { plain?: string; html?: string } = {};
  const walk = (p?: Part | null) => {
    if (!p || (found.plain && found.html)) return;
    const type = (p.mimeType || "").toLowerCase();
    if (!p.filename && p.body?.data) {
      if (type.startsWith("text/plain") && !found.plain) found.plain = decodeB64Url(p.body.data);
      else if (type.startsWith("text/html") && !found.html) found.html = decodeB64Url(p.body.data);
    }
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  const text = found.plain?.trim() ? found.plain : found.html ? stripHtml(found.html) : "";
  return text.trim().slice(0, maxChars);
}
