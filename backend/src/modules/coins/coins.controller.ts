import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoinsService } from './coins.service';
import { MarketsQuery, OhlcQuery, SearchQuery } from './dto';

@ApiTags('coins')
@Controller('coins')
export class CoinsController {
  constructor(private readonly coins: CoinsService) {}

  // Paginated server-side: frontend never loads 1000s of rows. per_page<=50 enforced by DTO.
  @Get('markets')
  markets(@Query() q: MarketsQuery) {
    return this.coins.markets(q.per_page ?? 10, q.page ?? 1, q.vs_currency ?? 'usd');
  }

  @Get('trending')
  trending() {
    return this.coins.trending();
  }

  @Get('categories')
  categories() {
    return this.coins.categories();
  }

  @Get('movers')
  movers() {
    return this.coins.movers();
  }

  @Get('search')
  search(@Query() q: SearchQuery) {
    return this.coins.search(q.q);
  }

  // NOTE: parameterized routes last — /search, /trending etc. must match first.
  @Get(':id')
  coin(@Param('id') id: string) {
    return this.coins.coin(id);
  }

  @Get(':id/ohlc')
  ohlc(@Param('id') id: string, @Query() q: OhlcQuery) {
    return this.coins.ohlc(id, q.days ?? '7');
  }
}
