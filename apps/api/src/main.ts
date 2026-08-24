import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { json, urlencoded } from "express";
import { AppModule } from "@/app.module";
import { KnifeOAuthProvider } from "@/mcp/oauth/knife-oauth.provider";
import { KNIFE_SCOPES } from "@/mcp/oauth/knife-scopes";

/**
 * A sheet arrives in batches, and the default hundred kilobytes cut them off
 * at roughly two thousand chunks. Stated here rather than inherited, so the
 * limit and the batch size are visible next to each other.
 */
const MAX_BODY = "2mb";

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: MAX_BODY }));
  /** The consent screen posts an ordinary form, and forms are not JSON. */
  app.use(urlencoded({ extended: false }));

  /**
   * Where an agent learns how to get in: metadata, registration, the code
   * exchange. It has to sit at the root, because a client that has only ever
   * been told the address of this server finds everything else from
   * /.well-known — nothing about it can be nested behind a prefix.
   */
  const publicUrl = (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  app.use(
    mcpAuthRouter({
      issuerUrl: new URL(publicUrl),
      provider: app.get(KnifeOAuthProvider),
      resourceName: "Knife",
      resourceServerUrl: new URL(`${publicUrl}/mcp`),
      scopesSupported: [...KNIFE_SCOPES],
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    credentials: true,
    origin: process.env.CORS_ORIGIN ?? true,
  });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  new Logger("Knife").log(`API listening on :${port}`);
};

void bootstrap();
