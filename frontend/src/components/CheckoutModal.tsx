import React, { useState } from 'react';
import { api } from '../services/api';
import { BookingRecord, PaymentProviderType } from '../types';
import { X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord;
  onPaymentSuccess: (transactionId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
}) => {
  const [provider, setProvider] = useState<PaymentProviderType>('MOCK_STRIPE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    // Generate client-side idempotency key based on booking reference and attempt
    const idempotencyKey = `idem_${booking.id}_${provider}_${booking.bookingReference}`;

    try {
      const res = await api.processPayment({
        bookingId: booking.id,
        provider,
        idempotencyKey,
      });

      setSuccessResult(res);
      onPaymentSuccess(res.transactionId);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Secure Mock Checkout</h3>
              <p className="text-[11px] text-slate-500 font-medium">Pluggable Payment Gateway (Strategy Pattern)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {successResult ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Payment Confirmed!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your tickets have been officially booked and guaranteed.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-bold font-mono text-slate-900">{successResult.bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono text-indigo-600">{successResult.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Provider:</span>
                  <span className="font-semibold text-slate-800">{successResult.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Charged:</span>
                  <span className="font-bold text-emerald-600">${successResult.amount.toFixed(2)}</span>
                </div>
                {successResult.isIdempotentReplay && (
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-medium mt-2">
                    ⚡ Idempotent Replay: Retried with identical key. No duplicate charge incurred.
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow transition"
              >
                Close & View My Bookings
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Booking Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                  <span>Reference</span>
                  <span className="font-mono font-bold text-slate-800">{booking.bookingReference}</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900">{booking.eventTitle || 'Selected Event'}</h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.seats?.map((s) => `${s.rowLabel}${s.seatNumber} (${s.tierName})`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">${booking.totalPrice.toFixed(2)}</span>
                    <p className="text-[10px] text-slate-400">Total Due</p>
                  </div>
                </div>
              </div>

              {/* Pluggable Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Mock Payment Gateway (Strategy Pattern)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setProvider('MOCK_STRIPE')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      provider === 'MOCK_STRIPE'
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Mock Stripe</span>
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Simulates credit card authorization</p>
                  </div>

                  <div
                    onClick={() => setProvider('MOCK_PAYPAL')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      provider === 'MOCK_PAYPAL'
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Mock PayPal</span>
                      <RefreshCw className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Simulates digital wallet capture</p>
                  </div>
                </div>
              </div>

              {/* Idempotency Notice */}
              <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Idempotent API Guarantee:</strong> Repeating this payment on network retry will never double-charge.
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Processing via Strategy...' : `Authorize & Pay $${booking.totalPrice.toFixed(2)}`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
