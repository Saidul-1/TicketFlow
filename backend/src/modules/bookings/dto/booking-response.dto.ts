import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingSeatItemDto {
  @ApiProperty({ example: 'seat-uuid' })
  seatId: string;

  @ApiProperty({ example: 'A' })
  rowLabel: string;

  @ApiProperty({ example: 1 })
  seatNumber: number;

  @ApiProperty({ example: 'VIP Front Row' })
  tierName: string;

  @ApiProperty({ example: 150.0 })
  price: number;
}

export class BookingResponseDto {
  @ApiProperty({ example: 'booking-uuid' })
  id: string;

  @ApiProperty({ example: 'TF-20261122-A1B2C' })
  bookingReference: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.HELD })
  status: BookingStatus;

  @ApiProperty({ example: 'event-uuid' })
  eventId: string;

  @ApiProperty({ example: 'Coldplay Tour' })
  eventTitle: string;

  @ApiProperty({ example: 150.0 })
  totalPrice: number;

  @ApiProperty({ example: '2026-11-22T12:05:00.000Z' })
  holdExpiresAt: Date;

  @ApiProperty({ example: 300, description: 'Seconds remaining before hold expires' })
  secondsRemaining: number;

  @ApiProperty({ type: [BookingSeatItemDto] })
  seats: BookingSeatItemDto[];
}
