import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EventItem, SeatMapResponse, SeatMapItem, BookingRecord } from '../types';
import { CheckoutModal } from '../components/CheckoutModal';
import {
  Calendar,
  MapPin,
  ChevronLeft,
  Clock,
  AlertTriangle,
  Lock,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface EventDetailsPageProps {
  eventId: string;
  onBack: () => void;
  onNavigateToBookings: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  eventId,
  onBack,
  onNavigateToBookings,
}) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const loadEventAndSeats = async () => {
    try {
      const [eventData, seatMapData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventSeatMap(eventId),
      ]);
      setEvent(eventData);
      setSeatMap(seatMapData);

      // Check if user already has held seats in this event
      const myHeldSeat = seatMapData.seats.find((s) => s.isHeldByMe);
      if (myHeldSeat && myHeldSeat.secondsRemaining > 0) {
        setSecondsRemaining(myHeldSeat.secondsRemaining);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventAndSeats();
    // Refresh seat map every 8 seconds to reflect other users' holds & lazy releases
    const interval = setInterval(loadEventAndSeats, 8000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Live Hold Countdown Timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timer reached 0! Hold expired lazily
          setActiveBooking(null);
          loadEventAndSeats();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeatClick = async (seat: SeatMapItem) => {
    if (!user) {
      setErrorMessage('Please sign in to select and hold seats.');
      return;
    }

    if (seat.status !== 'AVAILABLE') {
      if (seat.isHeldByMe) {
        // Already held by this user
        return;
      }
      setErrorMessage(`Seat ${seat.rowLabel}${seat.seatNumber} is unavailable.`);
      return;
    }

    setErrorMessage(null);
    try {
      // ATOMIC HOLD API CALL
      const booking = await api.holdSeats(eventId, [seat.id]);
      setActiveBooking(booking);
      setSecondsRemaining(booking.secondsRemaining || 300);
      await loadEventAndSeats();
    } catch (err: any) {
      // Concurrency conflict error caught!
      setErrorMessage(err.message || 'Seat reservation conflict occurred. Please pick another seat.');
      await loadEventAndSeats();
    }
  };

  const handleReleaseHold = async () => {
    if (!activeBooking) return;
    try {
      await api.releaseHold(activeBooking.id);
      setActiveBooking(null);
      setSecondsRemaining(0);
      await loadEventAndSeats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to release hold');
    }
  };

  if (loading || !event || !seatMap) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Loading seat map...</p>
      </div>
    );
  }

  // Group seats by row
  const rowsMap: Record<string, SeatMapItem[]> = {};
  seatMap.seats.forEach((seat) => {
    if (!rowsMap[seat.rowLabel]) {
      rowsMap[seat.rowLabel] = [];
    }
    rowsMap[seat.rowLabel].push(seat);
  });
  const rowLabels = Object.keys(rowsMap).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Event Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  event.pricingStrategy === 'EARLY_BIRD'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {event.pricingStrategy === 'EARLY_BIRD' ? 'Early Bird Active (20% OFF)' : 'Standard Pricing'}
              </span>
              <span className="text-xs text-slate-500 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {event.city}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {event.title}
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {event.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>
                  {new Date(event.eventDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  • {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 md:w-72 shrink-0">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Seat Tiers & Base Prices</span>
            </h4>
            <div className="space-y-2 text-xs">
              {event.seatTiers.map((tier) => (
                <div key={tier.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-800">{tier.name}</span>
                  <span className="font-bold text-indigo-600">${Number(tier.basePrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Hold Timer Alert (if seat is held) */}
      {secondsRemaining > 0 && (
        <div className="sticky top-20 z-30 bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-lg border border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Temporary Seat Hold Active!</p>
              <p className="text-xs text-slate-900">
                Exclusive hold expires in <span className="font-mono font-black text-sm">{formatCountdown(secondsRemaining)}</span>. Complete checkout to secure your seats.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReleaseHold}
              className="px-3 py-1.5 bg-white/80 hover:bg-white text-slate-900 font-bold text-xs rounded-xl transition"
            >
              Release Hold
            </button>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {/* Concurrency Error / Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Seat Map Viewport */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900">Interactive Seat Selection</h2>
          <p className="text-xs text-slate-500 mt-1">
            Click an available seat to lock in a 5-minute atomic hold.
          </p>

          {/* Stage Visual */}
          <div className="mt-6 max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-gradient-to-r from-slate-200 via-indigo-100 to-slate-200 text-center font-bold text-xs tracking-widest text-slate-600 uppercase border border-slate-300 shadow-inner">
            STAGE / PERFORMANCE AREA
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-md bg-emerald-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-md bg-amber-400 border border-amber-600 animate-pulse"></span>
            <span>Held by You (5m)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-md bg-slate-300"></span>
            <span>Unavailable / Booked</span>
          </div>
        </div>

        {/* Seating Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-fit mx-auto flex flex-col items-center space-y-3">
            {rowLabels.map((row) => (
              <div key={row} className="flex items-center space-x-2">
                <span className="w-6 font-bold text-xs text-slate-400 text-center">{row}</span>
                <div className="flex items-center space-x-2">
                  {rowsMap[row].map((seat) => {
                    const isAvailable = seat.status === 'AVAILABLE';
                    const isHeldByMe = seat.isHeldByMe;
                    const isBookedOrHeldByOther = !isAvailable && !isHeldByMe;

                    let seatColor = 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-110';
                    if (isHeldByMe) {
                      seatColor = 'bg-amber-400 text-slate-950 font-bold border-2 border-amber-600 shadow-md animate-pulse';
                    } else if (isBookedOrHeldByOther) {
                      seatColor = 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-80';
                    }

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        disabled={isBookedOrHeldByOther}
                        title={`Row ${seat.rowLabel}, Seat ${seat.seatNumber} (${seat.tierName}) - $${seat.basePrice.toFixed(2)}`}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition shadow-sm ${seatColor}`}
                      >
                        {isBookedOrHeldByOther ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          `${seat.rowLabel}${seat.seatNumber}`
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="w-6 font-bold text-xs text-slate-400 text-center">{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Concurrency Callout */}
        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>
              <strong>Zero Double-Booking Guarantee:</strong> Row-level atomic updates lock your selected seat instantly upon click.
            </span>
          </div>
          {activeBooking && (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition"
            >
              Checkout Now (${activeBooking.totalPrice.toFixed(2)})
            </button>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {activeBooking && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            onNavigateToBookings();
          }}
          booking={activeBooking}
          onPaymentSuccess={() => {
            setActiveBooking(null);
            setSecondsRemaining(0);
            loadEventAndSeats();
          }}
        />
      )}
    </div>
  );
};
