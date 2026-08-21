import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "@/app.module";

/**
 * A sheet arrives in batches, and the default hundred kilobytes cut them off
 * at roughly two thousand chunks. Stated here rather than inherited, so the
 * limit and the batch size are visible next to each other.
 */
const MAX_BODY = "2mb";

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: MAX_BODY }));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? true });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  new Logger("Knife").log(`API listening on :${port}`);
};

void bootstrap();
