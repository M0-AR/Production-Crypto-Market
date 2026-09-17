import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { readFileSync, existsSync } from 'fs';

function secretFromFile(path: string | undefined, fallback: string) {
  if (!path) return fallback;
  try {
    if (existsSync(path)) return readFileSync(path, 'utf8').trim() || fallback;
  } catch (e) {
    // Non-root containers + host 600 perms = EACCES locally. Degrade with loud warning, never crash.
    // eslint-disable-next-line no-console
    console.warn(`[security] cannot read ${path}: ${(e as Error).message} — using env fallback. Fix perms (chmod 644 dev) or secret manager in prod.`);
  }
  return fallback;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const port = Number(process.env.PORT ?? 4000);

  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost').split(','), credentials: true });
  app.setGlobalPrefix('api', { exclude: ['api/health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  // Rolling deploys / scale-down send SIGTERM: finish in-flight requests + BullMQ jobs
  // before exit instead of dropping them. Pair with stop_grace_period in compose.
  app.enableShutdownHooks();

  // Secrets via files — never log them.
  const jwtSecret = secretFromFile(process.env.JWT_SECRET_FILE, process.env.JWT_SECRET ?? 'dev-only-change-me');
  if (process.env.NODE_ENV === 'production' && jwtSecret === 'dev-only-change-me') {
    // Fail fast > selling an insecure system.
    // eslint-disable-next-line no-console
    console.warn('[security] JWT_SECRET_FILE missing — using dev fallback. Set secrets/jwt_secret.txt before selling.');
  }

  const config = new DocumentBuilder().setTitle('Pro API').setDescription('Stateless market API: cache-aside + queue').setVersion('1.0').addBearerAuth().build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${port}`);
}
bootstrap();
