import { ContentService } from "./content.service";

/* Fakes stand in for the S3 client and the presigner so the ETag/presign logic
   is testable without network or credentials. */
function build(headImpl: () => any) {
  const sent: any[] = [];
  const s3: any = { send: async (cmd: any) => { sent.push(cmd.input); return headImpl(); } };
  const presigned: any[] = [];
  const presign = async (_c: any, cmd: any, opts: any) => {
    presigned.push({ input: cmd.input, opts });
    return "https://signed.example/bundle.json";
  };
  const config: any = { get: () => "ip-content-bucket" };
  return { svc: new ContentService(config, s3, presign), sent, presigned };
}

const notFound = () => {
  const e: any = new Error("Not Found");
  e.name = "NotFound";
  e.$metadata = { httpStatusCode: 404 };
  throw e;
};

describe("ContentService.getBundle", () => {
  it("short-circuits when the client ETag already matches", async () => {
    const { svc, presigned } = build(() => ({ ETag: '"abc123"' }));
    expect(await svc.getBundle("abc123")).toEqual({ unchanged: true });
    expect(presigned).toHaveLength(0);
  });

  it("presigns a 300-second URL when the ETag is stale", async () => {
    const { svc, presigned } = build(() => ({ ETag: '"abc123"' }));
    const out: any = await svc.getBundle("old");
    expect(out).toEqual({ url: "https://signed.example/bundle.json", etag: "abc123" });
    expect(presigned[0].input).toEqual({ Bucket: "ip-content-bucket", Key: "bundle.json" });
    expect(presigned[0].opts).toEqual({ expiresIn: 300 });
  });

  it("presigns when the client sends no ETag", async () => {
    const { svc, presigned } = build(() => ({ ETag: '"abc123"' }));
    const out: any = await svc.getBundle(undefined);
    expect(out.url).toBe("https://signed.example/bundle.json");
    expect(presigned).toHaveLength(1);
  });

  it("strips the quotes S3 wraps around ETags", async () => {
    const { svc } = build(() => ({ ETag: '"quoted"' }));
    const out: any = await svc.getBundle(undefined);
    expect(out.etag).toBe("quoted");
  });

  it("reports an empty bundle when the object does not exist yet", async () => {
    const { svc } = build(notFound);
    expect(await svc.getBundle("old")).toEqual({ url: null, etag: "" });
  });

  it("propagates errors that are not 404 rather than masking them as empty", async () => {
    const { svc } = build(() => { throw new Error("AccessDenied"); });
    await expect(svc.getBundle(undefined)).rejects.toThrow("AccessDenied");
  });
});
