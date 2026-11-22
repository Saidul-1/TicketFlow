import {
  EventItem,
  SeatMapResponse,
  BookingRecord,
  AppNotification,
  User,
  PaymentProviderType,
  PricingStrategyType,
} from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('tf_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
      const error: any = new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // Auth
  async login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    role: 'ORGANIZER' | 'CUSTOMER',
  ): Promise<{ accessToken: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  // Events
  async getEvents(params: { search?: string; city?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.city) query.append('city', params.city);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    return this.request<{
      data: EventItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/events?${query.toString()}`);
  }

  async getEvent(id: string): Promise<EventItem> {
    return this.request(`/events/${id}`);
  }

  async getEventSeatMap(id: string): Promise<SeatMapResponse> {
    return this.request(`/events/${id}/seats`);
  }

  async createEvent(payload: {
    title: string;
    description: string;
    venue: string;
    city: string;
    eventDate: string;
    pricingStrategy: PricingStrategyType;
    totalRows: number;
    seatsPerRow: number;
    tiers: { name: string; basePrice: number; fromRow: number; toRow: number }[];
  }) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOrganizerEvents(): Promise<EventItem[]> {
    return this.request('/events/organizer/my-events');
  }

  // Bookings & Holds
  async holdSeats(eventId: string, seatIds: string[]): Promise<BookingRecord> {
    return this.request('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify({ eventId, seatIds }),
    });
  }

  async releaseHold(bookingId: string) {
    return this.request(`/bookings/${bookingId}/release`, {
      method: 'POST',
    });
  }

  async getMyBookings(): Promise<BookingRecord[]> {
    return this.request('/bookings/my-bookings');
  }

  async getBooking(id: string): Promise<BookingRecord> {
    return this.request(`/bookings/${id}`);
  }

  async cancelBooking(bookingId: string): Promise<{
    success: boolean;
    bookingReference: string;
    refundPercentage: number;
    refundAmount: number;
    message: string;
  }> {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
  }

  // Payments
  async processPayment(payload: {
    bookingId: string;
    provider: PaymentProviderType;
    idempotencyKey: string;
  }): Promise<{
    success: boolean;
    isIdempotentReplay: boolean;
    message: string;
    bookingReference: string;
    transactionId: string;
    provider: PaymentProviderType;
    amount: number;
    status: string;
  }> {
    return this.request('/payments/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Notifications
  async getNotifications(): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string): Promise<AppNotification> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  }
}

export const api = new ApiClient();
