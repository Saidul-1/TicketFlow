import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EventItem, PricingStrategyType } from '../types';
import {
  Calendar,
  MapPin,
  Plus,
  Shield,
  Tag,
  Grid,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';

interface OrganizerDashboardPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const OrganizerDashboardPage: React.FC<OrganizerDashboardPageProps> = ({
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [eventDate, setEventDate] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategyType>('STANDARD');
  const [totalRows, setTotalRows] = useState<number>(4);
  const [seatsPerRow, setSeatsPerRow] = useState<number>(8);
  const [tiers, setTiers] = useState<
    { name: string; basePrice: number; fromRow: number; toRow: number }[]
  >([
    { name: 'VIP Premium', basePrice: 150, fromRow: 1, toRow: 2 },
    { name: 'General Admission', basePrice: 60, fromRow: 3, toRow: 4 },
  ]);

  const loadOrganizerEvents = async () => {
    try {
      const data = await api.getOrganizerEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load organizer events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizerEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    try {
      await api.createEvent({
        title,
        description,
        venue,
        city,
        eventDate: new Date(eventDate).toISOString(),
        pricingStrategy,
        totalRows: Number(totalRows),
        seatsPerRow: Number(seatsPerRow),
        tiers: tiers.map((t) => ({
          name: t.name,
          basePrice: Number(t.basePrice),
          fromRow: Number(t.fromRow),
          toRow: Number(t.toRow),
        })),
      });

      setIsModalOpen(false);
      resetForm();
      await loadOrganizerEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVenue('');
    setCity('Dhaka');
    setEventDate('');
    setPricingStrategy('STANDARD');
    setTotalRows(4);
    setSeatsPerRow(8);
    setTiers([
      { name: 'VIP Premium', basePrice: 150, fromRow: 1, toRow: 2 },
      { name: 'General Admission', basePrice: 60, fromRow: 3, toRow: 4 },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-600 mb-1">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Organizer Studio (RBAC)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Event Management</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Create events with dynamic tiered seat maps and enforce event ownership security.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Organizer Events Table / Cards */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading your organized events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <Grid className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No events created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Create New Event&quot; to configure venue, dates, seat dimensions, and tiered pricing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      event.pricingStrategy === 'EARLY_BIRD'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {event.pricingStrategy}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{event.city}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base line-clamp-1">{event.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    <span>{event.venue}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Grid className="w-4 h-4 text-purple-500" />
                    <span>
                      {event.totalRows} Rows × {event.seatsPerRow} Seats ({event._count?.seats || event.totalRows * event.seatsPerRow} Seats)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Bookings Placed</span>
                  <p className="text-base font-bold text-slate-900">{event._count?.bookings || 0}</p>
                </div>
                <button
                  onClick={() => onSelectEvent(event.id)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1"
                >
                  <span>View Seat Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal Wizard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Create Event with Seat Grid</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Symphony of Stars Live Concert"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Grand Auditorium"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dhaka"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Grid Dimensions & Pricing Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    required
                    value={totalRows}
                    onChange={(e) => setTotalRows(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Rows A through {String.fromCharCode(64 + totalRows)}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seats Per Row</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Columns 1 to {seatsPerRow}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pricing Strategy</label>
                  <select
                    value={pricingStrategy}
                    onChange={(e) => setPricingStrategy(e.target.value as PricingStrategyType)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="STANDARD">Standard Pricing</option>
                    <option value="EARLY_BIRD">Early Bird (20% OFF)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Strategy Pattern applied</p>
                </div>
              </div>

              {/* Tier Builder */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>Seat Tiers Configuration (Total: {totalRows * seatsPerRow} Seats)</span>
                </label>
                <div className="space-y-2">
                  {tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <input
                        type="text"
                        placeholder="Tier Name"
                        value={tier.name}
                        onChange={(e) => {
                          const updated = [...tiers];
                          updated[index].name = e.target.value;
                          setTiers(updated);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        placeholder="Base Price ($)"
                        value={tier.basePrice}
                        onChange={(e) => {
                          const updated = [...tiers];
                          updated[index].basePrice = Number(e.target.value);
                          setTiers(updated);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        placeholder="From Row"
                        value={tier.fromRow}
                        onChange={(e) => {
                          const updated = [...tiers];
                          updated[index].fromRow = Number(e.target.value);
                          setTiers(updated);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        placeholder="To Row"
                        value={tier.toRow}
                        onChange={(e) => {
                          const updated = [...tiers];
                          updated[index].toRow = Number(e.target.value);
                          setTiers(updated);
                        }}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submitLoading ? 'Generating Grid...' : 'Publish Event & Generate Seats'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
