import { ApiProperty } from '@nestjs/swagger';
import { SeatStatus } from '@prisma/client';
import { BookingResponseDto } from '../../bookings/dto/booking-response.dto';

export class SeatMapItemDto {
  @ApiProperty({ example: 'seat-uuid' })
  id: string;

  @ApiProperty({ example: 'A' })
  rowLabel: string;

  @ApiProperty({ example: 1 })
  seatNumber: number;

  @ApiProperty({ example: 'tier-uuid' })
  tierId: string;

  @ApiProperty({ example: 'VIP Front Row' })
  tierName: string;

  @ApiProperty({ example: 150.0 })
  basePrice: number;

  @ApiProperty({ enum: SeatStatus, example: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @ApiProperty({ example: false, description: 'True if currently held by the requesting user' })
  isHeldByMe: boolean;

  @ApiProperty({ example: 240, description: 'Seconds remaining before hold expires (if held)' })
  secondsRemaining: number;
}

export class SeatMapResponseDto {
  @ApiProperty({ example: 'event-uuid' })
  eventId: string;

  @ApiProperty({ example: 'Coldplay Concert' })
  eventTitle: string;

  @ApiProperty({ example: 5 })
  totalRows: number;

  @ApiProperty({ example: 8 })
  seatsPerRow: number;

  @ApiProperty({ type: [SeatMapItemDto] })
  seats: SeatMapItemDto[];

  @ApiProperty({ type: () => BookingResponseDto, required: false })
  activeBooking?: BookingResponseDto;
}

