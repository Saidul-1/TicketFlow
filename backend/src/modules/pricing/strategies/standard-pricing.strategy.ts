import { Injectable } from '@nestjs/common';
import { PricingStrategy } from '../interfaces/pricing-strategy.interface';
import { PricingStrategyType } from '@prisma/client';

/**
 * Concrete Strategy: Standard Pricing
 * Returns unmodified base tier price.
 */
@Injectable()
export class StandardPricingStrategy implements PricingStrategy {
  readonly strategyType = PricingStrategyType.STANDARD;

  calculatePrice(basePrice: number, _eventDate: Date, _bookingDate: Date): number {
    return Number(basePrice);
  }
}
