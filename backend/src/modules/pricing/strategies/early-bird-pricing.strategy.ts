import { Injectable } from '@nestjs/common';
import { PricingStrategy } from '../interfaces/pricing-strategy.interface';
import { PricingStrategyType } from '@prisma/client';

/**
 * Concrete Strategy: Early-Bird Dynamic Pricing
 * Rule: 20% discount if ticket is reserved >= 7 days before event date.
 * Otherwise, standard tier base price applies.
 */
@Injectable()
export class EarlyBirdPricingStrategy implements PricingStrategy {
  readonly strategyType = PricingStrategyType.EARLY_BIRD;
  private readonly DISCOUNT_PERCENT = 0.2; // 20% discount
  private readonly THRESHOLD_DAYS = 7;

  calculatePrice(basePrice: number, eventDate: Date, bookingDate: Date): number {
    const diffTime = eventDate.getTime() - bookingDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays >= this.THRESHOLD_DAYS) {
      const discounted = basePrice * (1 - this.DISCOUNT_PERCENT);
      return Math.round(discounted * 100) / 100; // Round to 2 decimals
    }

    return Number(basePrice);
  }
}
