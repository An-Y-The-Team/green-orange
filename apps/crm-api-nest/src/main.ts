import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";

import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./common/prisma-exception.filter";
import { SerializeInterceptor } from "./common/serialize.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
