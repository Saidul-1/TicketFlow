import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Trash2,
  Zap,
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
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  const activeBookingRef = useRef<BookingRecord | null>(null);
  activeBookingRef.current = activeBooking;

  const loadEventAndSeats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [eventData, seatMapData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventSeatMap(eventId),
      ]);
      setEvent(eventData);
      setSeatMap(seatMapData);

      // Restore active booking from server if present
      if (seatMapData.activeBooking) {
        setActiveBooking(seatMapData.activeBooking);
      } else if (activeBookingRef.current && !seatMapData.seats.some((s) => s.isHeldByMe)) {
        // Hold expired on server
        setActiveBooking(null);
        setSecondsRemaining(0);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load event details');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEventAndSeats();
    // Refresh seat map every 10 seconds to reflect other users' holds & lazy releases
    const interval = setInterval(() => loadEventAndSeats(true), 10000);
    return () => clearInterval(interval);
  }, [eventId, user?.id]);

  // Smooth, monotonic countdown timer using target timestamp (Zero jitter!)
  useEffect(() => {
    if (!activeBooking?.holdExpiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const targetTime = new Date(activeBooking.holdExpiresAt).getTime();

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setActiveBooking(null);
        setErrorMessage('Your 5-minute seat hold has expired. The seats have been released.');
        loadEventAndSeats(true);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeBooking?.holdExpiresAt]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Seat Click handler
  const handleSeatClick = async (seat: SeatMapItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      setErrorMessage('Please sign in to select and hold seats.');
      return;
    }

    // If seat is currently held by this user
    if (seat.isHeldByMe) {
      setSuccessMessage(`You are currently holding seat ${seat.rowLabel}${seat.seatNumber}. Complete checkout or click "Release Hold" to change seats.`);
      return;
    }

    // If seat is held by someone else or booked
    if (seat.status !== 'AVAILABLE') {
      // Allow testing the race condition: Attempt hold to trigger 409 Conflict
      try {
        await api.holdSeats(eventId, [seat.id]);
      } catch (err: any) {
        setErrorMessage(
          err.message || `Seat ${seat.rowLabel}${seat.seatNumber} is already held or booked by another user. Zero double-booking guarantee enforced.`
        );
      }
      return;
    }

    // Toggle seat selection
    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      setSelectedSeatIds((prev) => [...prev, seat.id]);
    }
  };

  // Execute Atomic Hold on all selected seats
  const handleHoldSelectedSeats = async () => {
    if (selectedSeatIds.length === 0) return;
    if (!user) {
      setErrorMessage('Please sign in to hold seats.');
      return;
    }

    setIsHolding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const booking = await api.holdSeats(eventId, selectedSeatIds);
      setActiveBooking(booking);
      setSelectedSeatIds([]);
      const seatsCount = (booking.seats || []).length;
      setSuccessMessage(`Successfully placed ${seatsCount} seat(s) on a 5-minute atomic hold!`);
      await loadEventAndSeats(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Seat reservation conflict occurred. Please pick another seat.');
      await loadEventAndSeats(true);
    } finally {
      setIsHolding(false);
    }
  };

  // Release active hold
  const handleReleaseHold = async () => {
    if (!activeBooking) return;
    setIsReleasing(true);
    setErrorMessage(null);
    try {
      await api.releaseHold(activeBooking.id);
      setActiveBooking(null);
      setSecondsRemaining(0);
      setSuccessMessage('Your seat hold was released and made available for other customers.');
      await loadEventAndSeats(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to release hold');
    } finally {
      setIsReleasing(false);
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

  // Calculate pricing for currently selected seats
  const selectedSeatsList = seatMap.seats.filter((s) => selectedSeatIds.includes(s.id));
  const rawSelectedTotal = selectedSeatsList.reduce((sum, s) => sum + s.basePrice, 0);
  const discountMultiplier = event.pricingStrategy === 'EARLY_BIRD' ? 0.8 : 1.0;
  const estimatedTotal = rawSelectedTotal * discountMultiplier;

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

      {/* Sticky Hold Timer Alert (if seats are currently held) */}
      {activeBooking && secondsRemaining > 0 && (
        <div className="sticky top-20 z-30 bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-xl border border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                Temporary Hold Active! ({(activeBooking.seats || []).map((s) => `${s.rowLabel}${s.seatNumber}`).join(', ')})
              </p>
              <p className="text-xs text-slate-900">
                Exclusive hold expires in <span className="font-mono font-black text-sm">{formatCountdown(secondsRemaining)}</span>. Complete checkout to confirm your tickets.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleReleaseHold}
              disabled={isReleasing}
              className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isReleasing ? 'Releasing...' : 'Release Hold'}
            </button>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Proceed to Payment (${activeBooking.totalPrice.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* Concurrency Error Banner */}
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

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium leading-relaxed">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold text-xs px-2 py-1"
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
            Click available seats to select, then click &quot;Hold Selected Seats&quot; to lock them in a 5-minute atomic hold.
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
            <span className="w-4 h-4 rounded-md bg-indigo-600 border border-indigo-700"></span>
            <span>Selected (Click to Hold)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-md bg-amber-400 border border-amber-600 animate-pulse"></span>
            <span>Held by You (5m)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300"></span>
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
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isBookedOrHeldByOther = !isAvailable && !isHeldByMe;

                    let seatColor = 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105';
                    if (isHeldByMe) {
                      seatColor = 'bg-amber-400 text-slate-950 font-bold border-2 border-amber-600 shadow-md animate-pulse';
                    } else if (isSelected) {
                      seatColor = 'bg-indigo-600 text-white font-bold ring-4 ring-indigo-200 shadow-lg scale-105';
                    } else if (isBookedOrHeldByOther) {
                      seatColor = 'bg-slate-200 text-slate-400 hover:bg-slate-300 border border-slate-300';
                    }

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSeatClick(seat)}
                        title={`Row ${seat.rowLabel}, Seat ${seat.seatNumber} (${seat.tierName}) - $${seat.basePrice.toFixed(2)}${
                          isBookedOrHeldByOther ? ' (Click to test concurrency conflict)' : ''
                        }`}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition shadow-sm ${seatColor}`}
                      >
                        {isBookedOrHeldByOther ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : isSelected ? (
                          <CheckCircle2 className="w-4 h-4" />
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

        {/* Selected Seats Batch Action Bar */}
        {selectedSeatIds.length > 0 && (
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                {selectedSeatIds.length}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">
                  {selectedSeatIds.length} Seat(s) Selected:{' '}
                  <span className="text-indigo-600">
                    {selectedSeatsList.map((s) => `${s.rowLabel}${s.seatNumber}`).join(', ')}
                  </span>
                </p>
                <p className="text-xs text-slate-600">
                  Total: <strong className="text-slate-900 font-mono">${estimatedTotal.toFixed(2)}</strong>
                  {event.pricingStrategy === 'EARLY_BIRD' && ' (Includes 20% Early Bird Discount!)'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedSeatIds([])}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleHoldSelectedSeats}
                disabled={isHolding}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isHolding ? 'Locking Seats...' : `Hold ${selectedSeatIds.length} Seat(s) (5:00)`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Concurrency Callout */}
        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              <strong>Zero Double-Booking Guarantee:</strong> Row-level atomic conditional updates guarantee exactly one winner under simultaneous concurrent requests.
            </span>
          </div>
          {activeBooking && (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow transition shrink-0"
            >
              Checkout Held Seats (${activeBooking.totalPrice.toFixed(2)})
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
            setSelectedSeatIds([]);
            loadEventAndSeats(true);
          }}
        />
      )}
    </div>
  );
};
