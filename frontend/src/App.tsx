import { Ticket, Calendar, ShieldCheck, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow">
              <Ticket className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Ticket<span className="text-indigo-600">Flow</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              API Live
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          High-Concurrency Event Ticketing
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Built with Clean Architecture, SOLID Principles, and Atomic Concurrency Controls to prevent double-booking.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Atomic Hold Engine</h3>
            <p className="mt-2 text-sm text-slate-600">
              Zero double-booking guarantee powered by row-level conditional updates and automatic 5-minute lazy expiration.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Enterprise SOLID Design</h3>
            <p className="mt-2 text-sm text-slate-600">
              Pluggable Strategy pattern for payments & pricing, Observer pattern for decoupled notifications, and State pattern for booking lifecycle.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Dual Roles (RBAC)</h3>
            <p className="mt-2 text-sm text-slate-600">
              Full isolation between Event Organizers (venue & seat map management) and Customers (real-time seat selection & booking).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-500">
        TicketFlow &copy; 2026. CPS Academy InterviewQuest-3 Round 5 Assignment.
      </footer>
    </div>
  );
}

export default App;
