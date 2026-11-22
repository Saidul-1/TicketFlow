import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PricingStrategyType } from '@prisma/client';

export class SeatTierDto {
  @ApiProperty({ example: 'VIP', description: 'Tier category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 120.0, description: 'Base ticket price for this tier' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 1, description: 'Starting row number (1-indexed)' })
  @IsInt()
  @Min(1)
  fromRow: number;

  @ApiProperty({ example: 2, description: 'Ending row number (1-indexed, inclusive)' })
  @IsInt()
  @Min(1)
  toRow: number;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Imagine Dragons Mercury World Tour' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Experience electrifying rock live in Dhaka.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Army Stadium' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '2026-12-15T18:00:00.000Z' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({
    enum: PricingStrategyType,
    default: PricingStrategyType.STANDARD,
    description: 'Dynamic pricing strategy for this event',
  })
  @IsEnum(PricingStrategyType)
  pricingStrategy: PricingStrategyType;

  @ApiProperty({ example: 5, description: 'Total number of seat rows (e.g. 1-26 max)' })
  @IsInt()
  @Min(1)
  @Max(26)
  totalRows: number;

  @ApiProperty({ example: 8, description: 'Seats per row (e.g. 1-50 max)' })
  @IsInt()
  @Min(1)
  @Max(50)
  seatsPerRow: number;

  @ApiProperty({ type: [SeatTierDto], description: 'Seat tiers with category pricing' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatTierDto)
  tiers: SeatTierDto[];
}
