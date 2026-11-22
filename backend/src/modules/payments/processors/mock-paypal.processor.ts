import { Injectable } from '@nestjs/common';
import { PaymentProcessor, PaymentRequest, PaymentResult } from '../interfaces/payment-processor.interface';
import { PaymentProviderType } from '@prisma/client';

/**
 * Concrete Strategy: Mock PayPal Processor
 * Simulates digital wallet authorization and capture.
 */
@Injectable()
export class MockPaypalProcessor implements PaymentProcessor {
  readonly providerType = PaymentProviderType.MOCK_PAYPAL;

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const transactionId = `PAYPAL-MOCK-${randomHex}`;

    return {
      success: true,
      transactionId,
      provider: this.providerType,
      amount: request.amount,
      timestamp: new Date(),
      message: `PayPal wallet payment captured for $${request.amount.toFixed(2)}`,
    };
  }
}
