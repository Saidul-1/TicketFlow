import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Payments (Strategy Pattern & Idempotency)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process booking payment using selected provider with idempotency protection',
  })
  @ApiResponse({ status: 200, description: 'Payment authorized and booking confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid payment request or expired hold' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot pay for another user booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async processPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(userId, dto);
  }
}
