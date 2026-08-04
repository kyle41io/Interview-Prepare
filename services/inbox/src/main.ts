import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { InboxAppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(InboxAppModule);
  const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:8000").split(",").map(s => s.trim());
  app.enableCors({ origin: origins, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["authorization", "content-type"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3005);
}
bootstrap();
