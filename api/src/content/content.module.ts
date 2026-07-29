import { Module } from "@nestjs/common";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ContentController } from "./content.controller";
import { ContentService, PRESIGNER, S3_CLIENT } from "./content.service";

@Module({
  controllers: [ContentController],
  providers: [
    ContentService,
    {
      // No explicit credentials: the Lambda execution role supplies them,
      // including the session token that key-id/secret alone would omit.
      provide: S3_CLIENT,
      useFactory: () => new S3Client({}),
    },
    { provide: PRESIGNER, useValue: getSignedUrl },
  ],
})
export class ContentModule {}
