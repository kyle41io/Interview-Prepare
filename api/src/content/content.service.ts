import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const S3_CLIENT = "CONTENT_S3_CLIENT";
export const PRESIGNER = "CONTENT_PRESIGNER";
export const BUNDLE_KEY = "bundle.json";

// Long enough for a slow first load, short enough that a leaked URL expires fast.
const URL_TTL_SECONDS = 300;

export type Presigner = (
  client: S3Client,
  command: GetObjectCommand,
  options: { expiresIn: number },
) => Promise<string>;

type BundleRef = { unchanged: true } | { url: string | null; etag: string };

@Injectable()
export class ContentService {
  private readonly bucket: string;

  constructor(
    config: ConfigService,
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    @Inject(PRESIGNER) private readonly presign: Presigner,
  ) {
    this.bucket = config.get<string>("CONTENT_BUCKET") || "";
  }

  /* Returns a short-lived presigned URL rather than the bundle bytes: 1.3 MB
     through Lambda and API Gateway would be wasted transfer, and proxying would
     hit the 6 MB Lambda response ceiling as content grows. */
  async getBundle(clientEtag?: string): Promise<BundleRef> {
    let head;
    try {
      head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: BUNDLE_KEY }),
      );
    } catch (err: any) {
      // An unseeded bucket is a deploy-ordering state, not an error: the client
      // renders an empty app. Anything else (AccessDenied, throttling) must
      // surface rather than masquerade as "no content".
      if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
        return { url: null, etag: "" };
      }
      throw err;
    }

    // S3 wraps ETags in literal double quotes; the client round-trips this value
    // as a query parameter, so normalize once here.
    const etag = String(head.ETag ?? "").replace(/"/g, "");
    if (clientEtag && clientEtag === etag) return { unchanged: true };

    const url = await this.presign(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: BUNDLE_KEY }),
      { expiresIn: URL_TTL_SECONDS },
    );
    return { url, etag };
  }
}
