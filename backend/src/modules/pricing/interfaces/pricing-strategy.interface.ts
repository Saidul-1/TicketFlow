import { PricingStrategyType } from '@prisma/client';

/**
 * Strategy Pattern Interface: Pricing Calculation
 * Adheres to Open/Closed Principle: New pricing strategies (e.g. Surge, Weekend, Student)
 * can be plugged in without modifying existing booking services.
 */
export interface PricingStrategy {
  readonly strategyType: PricingStrategyType;

  /**
   * Calculates effective price per seat based on strategy rules.
   * @param basePrice Tier base price
   * @param eventDate Date of the event
   * @param bookingDate Date the booking/hold is placed
   * @returns Final price charged
   */
  calculatePrice(basePrice: number, eventDate: Date, bookingDate: Date): number;
}
