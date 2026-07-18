import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./modules/app.module";
import {
  corsOrigins,
  env,
  validateEnvironment,
} from "./modules/config/environment";
import { createCookieParser } from "./modules/http/cookie-parser";
import { securityHeaders } from "./modules/http/security-headers";

async function bootstrap(): Promise<void> {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);
  app.use(createCookieParser());
  app.use(securityHeaders());
  app.use(json({ limit: process.env.REQUEST_BODY_LIMIT ?? "1mb" }));
  app.use(
    urlencoded({
      extended: false,
      limit: process.env.REQUEST_BODY_LIMIT ?? "1mb",
    }),
  );
  app.enableCors({
    credentials: true,
    origin: corsOrigins(),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (env().SWAGGER_ENABLED === "true") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("CampusTest Pro API")
      .setDescription("Assessment operations API for CampusTest Pro.")
      .setVersion(env().RELEASE_VERSION)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = env().PORT ?? env().API_PORT;
  await app.listen(port);
}

void bootstrap();
