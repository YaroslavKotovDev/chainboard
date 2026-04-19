import 'reflect-metadata';

import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;
  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim());

  // Security
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API versioning — URI versioning adds /v1 prefix automatically (default version: 1)
  // Do NOT add setGlobalPrefix here — it would double the prefix to /v1/v1/...
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global pipes, filters, interceptors, guards
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ChainBoard API')
    .setDescription('Web3 Analytics Dashboard REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${port}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`🚀 API running at http://localhost:${port}`);
  console.log(`📚 Swagger at  http://localhost:${port}/api/docs`);
}

bootstrap().catch(console.error);
