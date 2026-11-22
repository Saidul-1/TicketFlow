import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookingRecord } from '../types';
import {
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  History,
  XCircle,
  CreditCard,
  Ticket,
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadBookings = async () => {
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    setActionMessage(null);

    try {
      const res = await api.cancelBooking(cancellingBooking.id);
      setActionMessage(res.message);
      setCancellingBooking(null);
      await loadBookings();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Bookings</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Track your reservation statuses, audit lifecycle logs, and manage cancellations with refund rules.
        </p>
      </div>

      {actionMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-2xl flex items-center justify-between shadow-sm">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-indigo-600 font-bold hover:text-indigo-800 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No bookings yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our live events catalog and select your favorite seats with our atomic reservation engine!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isHeld = booking.status === 'HELD';
            const isCancelled = booking.status === 'CANCELLED';

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                      {booking.bookingReference}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isHeld
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : isCancelled
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    Booked on {new Date(booking.createdAt).toLocaleDateString()} at{' '}
                    {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Event & Seats Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {booking.event?.title || 'Event Details'}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      {booking.event && (
                        <>
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span>{new Date(booking.event.eventDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-4 h-4 text-indigo-500" />
                            <span>
                              {booking.event.venue}, {booking.event.city}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seats Reserved:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {booking.bookingSeats?.map((bs) => (
                          <span
                            key={bs.id}
                            className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold rounded-lg"
                          >
                            Row {bs.seat.rowLabel}, Seat {bs.seat.seatNumber} ({bs.seat.seatTier.name}) - ${Number(bs.priceCharged).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment & Refund Details */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Amount</span>
                      <p className="text-2xl font-black text-slate-900">${booking.totalPrice.toFixed(2)}</p>
                      {booking.paymentProvider && (
                        <div className="flex items-center space-x-1 text-xs text-slate-600 pt-1">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Paid via {booking.paymentProvider}</span>
                        </div>
                      )}
                      {isCancelled && booking.refundAmount !== undefined && (
                        <div className="p-2 bg-red-50 text-red-800 rounded-lg text-xs font-semibold mt-2">
                          Refund: ${Number(booking.refundAmount).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {isConfirmed && (
                      <button
                        type="button"
                        onClick={() => setCancellingBooking(booking)}
                        className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs rounded-xl transition shadow-sm"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Status History Timeline */}
                {booking.statusHistory && booking.statusHistory.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Booking Lifecycle Audit Trail (State Pattern)</span>
                    </h5>
                    <div className="space-y-2">
                      {booking.statusHistory.map((history) => (
                        <div
                          key={history.id}
                          className="text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-indigo-600 font-mono">
                              {history.fromStatus ? `${history.fromStatus} ➔ ` : ''}
                              {history.toStatus}
                            </span>
                            <span className="text-slate-600 text-[11px]">— {history.reason}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(history.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Cancel Booking</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel booking{' '}
              <strong className="font-mono text-slate-900">{cancellingBooking.bookingReference}</strong>?
            </p>

            {/* Dynamic Refund Rule Alert */}
            {(() => {
              const eventDate = cancellingBooking.event ? new Date(cancellingBooking.event.eventDate).getTime() : 0;
              const hoursUntil = (eventDate - Date.now()) / (1000 * 60 * 60);
              const isFullRefund = hoursUntil > 24;

              return isFullRefund ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                  <div className="font-bold text-emerald-800 flex items-center space-x-1.5 mb-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Eligible for 100% Full Refund</span>
                  </div>
                  <p>
                    Because this cancellation is more than 24 hours prior to event start ({hoursUntil.toFixed(1)}h remaining), you will receive a <strong>100% full refund (${cancellingBooking.totalPrice.toFixed(2)})</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                  <div className="font-bold text-amber-800 flex items-center space-x-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Non-Refundable Policy</span>
                  </div>
                  <p>
                    This cancellation is within 24 hours of the event ({hoursUntil.toFixed(1)}h remaining). Per policy, <strong>$0.00 refund</strong> will be issued. The seat will be released.
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow transition disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
