import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@ip/auth";
import { ContentService } from "./content.service";

@UseGuards(JwtAuthGuard)
@Controller("v1/content")
export class ContentController {
  constructor(private readonly svc: ContentService) {}

  @Get("bundle")
  bundle(@Query("etag") etag?: string) {
    return this.svc.getBundle(etag);
  }
}
