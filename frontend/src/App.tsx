import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { EventBrowsePage } from './pages/EventBrowsePage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { ShieldCheck, Heart } from 'lucide-react';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'browse' | 'event-details' | 'my-bookings' | 'organizer'>('browse');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: 'browse' | 'my-bookings' | 'organizer') => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div>
        <Navbar currentView={currentView} onNavigate={handleNavigate} />

        <main className="pb-16">
          {currentView === 'browse' && (
            <EventBrowsePage onSelectEvent={handleSelectEvent} />
          )}

          {currentView === 'event-details' && selectedEventId && (
            <EventDetailsPage
              eventId={selectedEventId}
              onBack={() => handleNavigate('browse')}
              onNavigateToBookings={() => handleNavigate('my-bookings')}
            />
          )}

          {currentView === 'my-bookings' && <MyBookingsPage />}

          {currentView === 'organizer' && (
            user?.role === 'ORGANIZER' ? (
              <OrganizerDashboardPage onSelectEvent={handleSelectEvent} />
            ) : (
              <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto font-bold">
                  RBAC
                </div>
                <h3 className="text-lg font-bold text-slate-900">Organizer Access Required</h3>
                <p className="text-xs text-slate-500">
                  Please sign in with an Organizer account or use the &quot;Demo: Organizer&quot; quick switch in the top header.
                </p>
              </div>
            )
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-900 text-sm">Ticket<span className="text-indigo-600">Flow</span></span>
            <span>•</span>
            <span>CPS Academy InterviewQuest-3 Round 5 Assignment</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Clean Architecture & SOLID</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span>Zero Double-Booking Guarantee</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
