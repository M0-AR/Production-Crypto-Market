import { Module } from '@nestjs/common';
import { CoinsController } from './coins.controller';
import { SentimentController } from './sentiment.controller';
import { CoinsService } from './coins.service';

@Module({ controllers: [CoinsController, SentimentController], providers: [CoinsService], exports: [CoinsService] })
export class CoinsModule {}
