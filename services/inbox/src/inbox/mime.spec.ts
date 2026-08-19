import { decodeB64Url, extractBody } from "./mime";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("decodeB64Url", () => {
  it("decodes Gmail's base64url payloads, including UTF-8", () => {
    expect(decodeB64Url(b64("Thư mời phỏng vấn"))).toBe("Thư mời phỏng vấn");
  });
  it("survives padding and junk without throwing", () => {
    expect(decodeB64Url("")).toBe("");
    expect(decodeB64Url(undefined as any)).toBe("");
  });
});

describe("extractBody", () => {
  it("reads a single-part text/plain message", () => {
    const p = { mimeType: "text/plain", body: { data: b64("Interview at 10:00 on 2026-08-21") } };
    expect(extractBody(p)).toBe("Interview at 10:00 on 2026-08-21");
  });

  it("prefers text/plain inside multipart/alternative", () => {
    const p = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64("plain wins") } },
        { mimeType: "text/html", body: { data: b64("<p>html loses</p>") } },
      ],
    };
    expect(extractBody(p)).toBe("plain wins");
  });

  it("finds the text part nested under multipart/mixed", () => {
    const p = {
      mimeType: "multipart/mixed",
      parts: [
        { mimeType: "multipart/alternative", parts: [{ mimeType: "text/plain", body: { data: b64("deep text") } }] },
        { mimeType: "application/pdf", filename: "jd.pdf", body: { attachmentId: "a1" } },
      ],
    };
    expect(extractBody(p)).toBe("deep text");
  });

  it("falls back to HTML with the markup stripped", () => {
    const html = "<html><head><style>p{color:red}</style></head><body><p>Phỏng vấn v&ograve;ng 1</p><br><div>14:00 21/08</div></body></html>";
    const out = extractBody({ mimeType: "text/html", body: { data: b64(html) } });
    expect(out).toContain("Phỏng vấn vòng 1");
    expect(out).toContain("14:00 21/08");
    expect(out).not.toContain("<");
    expect(out).not.toContain("color:red");
  });

  it("caps the excerpt — the classifier pays per token and the schedule is near the top", () => {
    const p = { mimeType: "text/plain", body: { data: b64("x".repeat(9000)) } };
    expect(extractBody(p, 4000).length).toBe(4000);
  });

  it("no text anywhere -> empty string, never undefined", () => {
    expect(extractBody({ mimeType: "application/pdf", body: { attachmentId: "a1" } })).toBe("");
    expect(extractBody(undefined)).toBe("");
  });
});
