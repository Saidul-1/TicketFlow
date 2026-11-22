import { PaymentProviderType } from '@prisma/client';

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  customerEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  provider: PaymentProviderType;
  amount: number;
  timestamp: Date;
  message: string;
}

/**
 * Strategy Pattern Interface: Payment Provider
 * Adheres to:
 * - Open/Closed Principle: New payment gateways (e.g. SSLCommerz, bKash, Razorpay)
 *   can be added by implementing this interface without touching booking code.
 * - Liskov Substitution Principle: Any processor implementation is completely
 *   interchangeable at runtime.
 */
export interface PaymentProcessor {
  readonly providerType: PaymentProviderType;
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
}
