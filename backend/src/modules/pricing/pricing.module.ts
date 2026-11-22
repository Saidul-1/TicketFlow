import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { StandardPricingStrategy } from './strategies/standard-pricing.strategy';
import { EarlyBirdPricingStrategy } from './strategies/early-bird-pricing.strategy';

@Module({
  providers: [
    StandardPricingStrategy,
    EarlyBirdPricingStrategy,
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}
