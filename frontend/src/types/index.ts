export type Role = 'ORGANIZER' | 'CUSTOMER';

export type PricingStrategyType = 'STANDARD' | 'EARLY_BIRD';

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export type BookingStatus = 'HELD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export type PaymentProviderType = 'MOCK_STRIPE' | 'MOCK_PAYPAL';

export type NotificationType = 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface SeatTier {
  id: string;
  name: string;
  basePrice: number;
  fromRow: number;
  toRow: number;
}

export interface EventItem {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  eventDate: string;
  pricingStrategy: PricingStrategyType;
  totalRows: number;
  seatsPerRow: number;
  startingPrice: number;
  seatTiers: SeatTier[];
  _count?: {
    seats: number;
    bookings: number;
  };
}

export interface SeatMapItem {
  id: string;
  rowLabel: string;
  seatNumber: number;
  tierId: string;
  tierName: string;
  basePrice: number;
  status: SeatStatus;
  isHeldByMe: boolean;
  secondsRemaining: number;
}

export interface SeatMapResponse {
  eventId: string;
  eventTitle: string;
  totalRows: number;
  seatsPerRow: number;
  seats: SeatMapItem[];
  activeBooking?: BookingRecord;
}

export interface BookingSeatItem {
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  tierName: string;
  price: number;
}

export interface BookingStatusHistoryItem {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  reason: string | null;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  bookingReference: string;
  eventId: string;
  userId: string;
  status: BookingStatus;
  totalPrice: number;
  pricingStrategyUsed: string;
  eventTitle?: string;
  paymentProvider?: PaymentProviderType;
  paymentId?: string;
  refundAmount?: number;
  holdExpiresAt?: string;
  secondsRemaining: number;
  createdAt: string;
  event?: {
    id: string;
    title: string;
    venue: string;
    city: string;
    eventDate: string;
  };
  bookingSeats?: {
    id: string;
    priceCharged: number;
    seat: {
      id: string;
      rowLabel: string;
      seatNumber: number;
      seatTier: { name: string };
    };
  }[];
  seats?: BookingSeatItem[];
  statusHistory?: BookingStatusHistoryItem[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}
