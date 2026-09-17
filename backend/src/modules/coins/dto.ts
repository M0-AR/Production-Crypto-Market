import { IsInt, Min, Max, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class MarketsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) per_page?: number = 10;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) page?: number = 1;
  @IsOptional() @IsString() vs_currency?: string = 'usd';
}

export class SearchQuery {
  @IsString() @MinLength(2) @MaxLength(50) q!: string;
}

export class OhlcQuery {
  @IsOptional() @IsString() @Matches(/^(1|7|30|90|365)$/) days?: string = '7';
}
