import { Injectable } from '@nestjs/common';
import { PaymentProcessor, PaymentRequest, PaymentResult } from '../interfaces/payment-processor.interface';
import { PaymentProviderType } from '@prisma/client';

/**
 * Concrete Strategy: Mock Stripe Processor
 * Simulates credit card authorization and settlement.
 */
@Injectable()
export class MockStripeProcessor implements PaymentProcessor {
  readonly providerType = PaymentProviderType.MOCK_STRIPE;

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const transactionId = `ch_stripe_mock_${randomHex}`;

    return {
      success: true,
      transactionId,
      provider: this.providerType,
      amount: request.amount,
      timestamp: new Date(),
      message: `Stripe authorization successful for $${request.amount.toFixed(2)}`,
    };
  }
}
