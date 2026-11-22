import { Injectable, BadRequestException } from '@nestjs/common';
import { PricingStrategy } from './interfaces/pricing-strategy.interface';
import { StandardPricingStrategy } from './strategies/standard-pricing.strategy';
import { EarlyBirdPricingStrategy } from './strategies/early-bird-pricing.strategy';
import { PricingStrategyType } from '@prisma/client';

/**
 * Strategy Context: PricingService
 * Manages strategy registration and delegates calculations dynamically.
 */
@Injectable()
export class PricingService {
  private strategies = new Map<PricingStrategyType, PricingStrategy>();

  constructor(
    standardStrategy: StandardPricingStrategy,
    earlyBirdStrategy: EarlyBirdPricingStrategy,
  ) {
    this.registerStrategy(standardStrategy);
    this.registerStrategy(earlyBirdStrategy);
  }

  registerStrategy(strategy: PricingStrategy) {
    this.strategies.set(strategy.strategyType, strategy);
  }

  getStrategy(type: PricingStrategyType): PricingStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new BadRequestException(`No pricing strategy found for type "${type}"`);
    }
    return strategy;
  }

  /**
   * Delegates pricing calculation to the configured strategy.
   */
  calculatePrice(
    type: PricingStrategyType,
    basePrice: number,
    eventDate: Date,
    bookingDate: Date = new Date(),
  ): number {
    const strategy = this.getStrategy(type);
    return strategy.calculatePrice(basePrice, eventDate, bookingDate);
  }
}
