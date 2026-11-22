export class BookingCancelledEvent {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly eventTitle: string,
    public readonly bookingReference: string,
    public readonly refundAmount: number,
    public readonly refundPercentage: number,
  ) {}
}
