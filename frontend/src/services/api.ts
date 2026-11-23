import {
  EventItem,
  SeatMapResponse,
  BookingRecord,
  AppNotification,
  User,
  PaymentProviderType,
  PricingStrategyType,
} from '../types';

class ApiClient {
  public getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tf_api_url') || sessionStorage.getItem('tf_api_url');
      if (stored) return stored.replace(/\/+$/, '');
    }
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return 'http://localhost:4001';
  }

  public setBaseUrl(url: string) {
    if (typeof window !== 'undefined') {
      const cleaned = url.trim().replace(/\/+$/, '');
      localStorage.setItem('tf_api_url', cleaned);
      sessionStorage.setItem('tf_api_url', cleaned);
    }
  }

  public clearBaseUrlOverride() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tf_api_url');
      sessionStorage.removeItem('tf_api_url');
    }
  }

  private getToken(): string | null {
    return sessionStorage.getItem('tf_token') || localStorage.getItem('tf_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });
    } catch (netErr: any) {
      const isMixed = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:');
      const msg = isMixed
        ? `Browser blocked insecure connection to ${url} (Mixed Content). On HTTPS, backend must also be HTTPS. Please set VITE_API_URL in Vercel to your Render URL or click "Configure API URL".`
        : `Network Error: Unable to reach backend at ${url}. If using Render free tier, the backend may take 30-50 seconds to wake up from cold sleep.`;
      const error: any = new Error(msg);
      error.isNetworkError = true;
      throw error;
    }

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
