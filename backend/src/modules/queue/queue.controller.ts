import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';

@ApiTags('jobs')
@Controller('jobs')
export class QueueController {
  constructor(private readonly q: QueueService) {}
  // Example: verification email, receipt, webhook fan-out — user already got 200, this finishes later.
  @Post('enqueue')
  enqueue(@Body() body: { kind: string; payload?: Record<string, unknown>; idempotencyKey?: string }) {
    return this.q.enqueue(body.kind ?? 'email.verify', body.payload ?? {}, body.idempotencyKey);
  }
}
