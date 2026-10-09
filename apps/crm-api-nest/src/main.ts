import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";

import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./common/prisma-exception.filter";
import { SerializeInterceptor } from "./common/serialize.interceptor";

async function bootstrap() {
  // rawBody so the Zalo webhook can log the exact bytes Zalo signed. Its
  // signature spec is ambiguous in public sources (sorted-key concat vs
  // appId+body+timestamp, API Key vs app secret), and a re-serialised body
  // cannot settle it — only the bytes on the wire can.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3002")
    .split(",")
    .map((s) => s.trim());
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  app.useGlobalInterceptors(new SerializeInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter());

  await app.listen(Number(process.env.PORT ?? 8001));
}
void bootstrap();
