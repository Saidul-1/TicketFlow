export class BookingConfirmedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly eventTitle: string,
    public readonly bookingReference: string,
    public readonly amount: number,
    public readonly provider: string,
    public readonly transactionId: string,
  ) {}
}
