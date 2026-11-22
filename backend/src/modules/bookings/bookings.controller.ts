import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { HoldSeatsDto } from './dto/hold-seats.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bookings & Concurrency Seat Hold')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Hold one or more seats with 5-minute atomic reservation lock',
  })
  @ApiResponse({
    status: 201,
    description: 'Seats successfully held; booking created in HELD status',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - One or more selected seats are already reserved or booked',
  })
  async holdSeats(
    @CurrentUser('id') userId: string,
    @Body() dto: HoldSeatsDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.holdSeats(userId, dto);
  }

  @Post(':id/release')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voluntarily release held seats prior to payment' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Seats released and marked AVAILABLE' })
  @ApiResponse({ status: 400, description: 'Cannot release booking that is not in HELD state' })
  async releaseHold(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.releaseHold(userId, bookingId);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings placed by the current user' })
  @ApiResponse({ status: 200, description: 'User booking history' })
  async getMyBookings(@CurrentUser('id') userId: string) {
    return this.bookingsService.getUserBookings(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific booking details and status history' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking record' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access another user booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBooking(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.getBooking(userId, bookingId);
  }
}
