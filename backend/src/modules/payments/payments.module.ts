import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockStripeProcessor } from './processors/mock-stripe.processor';
import { MockPaypalProcessor } from './processors/mock-paypal.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    MockStripeProcessor,
    MockPaypalProcessor,
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
