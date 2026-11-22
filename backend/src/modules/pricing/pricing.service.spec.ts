import { PricingService } from './pricing.service';
import { StandardPricingStrategy } from './strategies/standard-pricing.strategy';
import { EarlyBirdPricingStrategy } from './strategies/early-bird-pricing.strategy';
import { PricingStrategyType } from '@prisma/client';

describe('PricingStrategy - Strategy Pattern Implementation', () => {
  let pricingService: PricingService;
  let standardStrategy: StandardPricingStrategy;
  let earlyBirdStrategy: EarlyBirdPricingStrategy;

  beforeEach(() => {
    standardStrategy = new StandardPricingStrategy();
    earlyBirdStrategy = new EarlyBirdPricingStrategy();
    pricingService = new PricingService(standardStrategy, earlyBirdStrategy);
  });

  describe('StandardPricingStrategy', () => {
    it('should return unmodified base price regardless of booking time', () => {
      const eventDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days out
      const bookingDate = new Date();

      const price = standardStrategy.calculatePrice(100.0, eventDate, bookingDate);
      expect(price).toBe(100.0);
    });
  });

  describe('EarlyBirdPricingStrategy', () => {
    it('should apply 20% discount if booked >= 7 days before event', () => {
      const bookingDate = new Date('2026-11-01T12:00:00Z');
      const eventDate = new Date('2026-11-15T12:00:00Z'); // 14 days later

      const price = earlyBirdStrategy.calculatePrice(100.0, eventDate, bookingDate);
      expect(price).toBe(80.0); // 20% off $100
    });

    it('should apply 20% discount on boundary of exactly 7 days before event', () => {
      const bookingDate = new Date('2026-11-01T12:00:00Z');
      const eventDate = new Date('2026-11-08T12:00:00Z'); // exactly 7 days later

      const price = earlyBirdStrategy.calculatePrice(150.0, eventDate, bookingDate);
      expect(price).toBe(120.0); // 20% off $150
    });

    it('should charge full base price if booked < 7 days before event', () => {
      const bookingDate = new Date('2026-11-05T12:00:00Z');
      const eventDate = new Date('2026-11-08T12:00:00Z'); // only 3 days later

      const price = earlyBirdStrategy.calculatePrice(100.0, eventDate, bookingDate);
      expect(price).toBe(100.0); // No discount
    });
  });

  describe('PricingService Strategy Context', () => {
    it('should dynamically dispatch to EarlyBird strategy when configured on event', () => {
      const bookingDate = new Date('2026-11-01T12:00:00Z');
      const eventDate = new Date('2026-11-15T12:00:00Z');

      const price = pricingService.calculatePrice(
        PricingStrategyType.EARLY_BIRD,
        200.0,
        eventDate,
        bookingDate,
      );

      expect(price).toBe(160.0); // 20% off $200
    });

    it('should dynamically dispatch to Standard strategy when configured on event', () => {
      const bookingDate = new Date('2026-11-01T12:00:00Z');
      const eventDate = new Date('2026-11-15T12:00:00Z');

      const price = pricingService.calculatePrice(
        PricingStrategyType.STANDARD,
        200.0,
        eventDate,
        bookingDate,
      );

      expect(price).toBe(200.0);
    });
  });
});
