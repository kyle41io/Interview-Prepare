import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "@ip/auth";
import { ChatService } from "./chat.service";
// Interface (erases to Object) — the global whitelist ValidationPipe would strip a
// decorated DTO's `messages` array; clampMessages() in the service validates instead.
interface ChatBody { messages?: Array<{ role: string; content: string }>; }
@Controller("v1/chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly svc: ChatService) {}
  @Post()
  chat(@CurrentUser() u: AuthUser, @Body() b: ChatBody) { return this.svc.chat(u, b?.messages); }
  @Get("history")
  history(@CurrentUser() u: AuthUser) { return this.svc.historyFor(u); }
  @Get("quota")
  quota(@CurrentUser() u: AuthUser) { return this.svc.quotaFor(u); }
}
