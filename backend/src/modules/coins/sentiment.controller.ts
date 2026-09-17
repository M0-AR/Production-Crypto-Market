import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoinsService } from '../coins/coins.service';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentController {
  constructor(private readonly coins: CoinsService) {}

  @Get()
  get() {
    return this.coins.sentiment();
  }
}
