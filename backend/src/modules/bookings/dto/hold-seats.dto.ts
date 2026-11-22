import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class HoldSeatsDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Event UUID' })
  @IsUUID('4', { message: 'eventId must be a valid UUID' })
  @IsNotEmpty({ message: 'eventId is required' })
  eventId: string;

  @ApiProperty({
    example: ['11111111-2222-3333-4444-555555555555'],
    description: 'Array of Seat UUIDs to hold',
  })
  @IsArray({ message: 'seatIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @IsUUID('4', { each: true, message: 'Each seatId must be a valid UUID' })
  seatIds: string[];
}
