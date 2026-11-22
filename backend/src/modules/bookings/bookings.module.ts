import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';
import { BookingLifecycleService } from './lifecycle/booking-lifecycle.service';
import { HeldState } from './lifecycle/states/held.state';
import { PendingPaymentState } from './lifecycle/states/pending-payment.state';
import { ConfirmedState } from './lifecycle/states/confirmed.state';
import { ExpiredState } from './lifecycle/states/expired.state';
import { CancelledState } from './lifecycle/states/cancelled.state';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [BookingsController],
  providers: [
    HeldState,
    PendingPaymentState,
    ConfirmedState,
    ExpiredState,
    CancelledState,
    BookingLifecycleService,
    BookingsService,
  ],
  exports: [BookingsService, BookingLifecycleService],
})
export class BookingsModule {}
