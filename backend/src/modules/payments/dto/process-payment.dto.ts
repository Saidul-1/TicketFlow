import { IsEnum, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentProviderType } from '@prisma/client';

export class ProcessPaymentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Booking UUID' })
  @IsUUID('4', { message: 'bookingId must be a valid UUID' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId: string;

  @ApiProperty({
    enum: PaymentProviderType,
    example: PaymentProviderType.MOCK_STRIPE,
    description: 'Payment provider to use: MOCK_STRIPE or MOCK_PAYPAL',
  })
  @IsEnum(PaymentProviderType, { message: 'Provider must be MOCK_STRIPE or MOCK_PAYPAL' })
  provider: PaymentProviderType;

  @ApiProperty({
    example: 'idem-key-9f8e7d6c-5b4a',
    description: 'Unique client-generated idempotency key preventing duplicate charges on retries',
  })
  @IsString()
  @MinLength(8, { message: 'Idempotency key must be at least 8 characters' })
  @IsNotEmpty({ message: 'idempotencyKey is required' })
  idempotencyKey: string;
}
