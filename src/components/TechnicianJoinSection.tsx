import React from 'react';
import { Wrench, LogIn, UserPlus, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';

interface TechnicianJoinSectionProps {
  onOpenTechnician?: (tab: 'login' | 'register') => void;
}

export const TechnicianJoinSection: React.FC<TechnicianJoinSectionProps> = ({
  onOpenTechnician,
}) => {
  const handleNavigate = (e: React.MouseEvent, tab: 'login' | 'register') => {
    e.preventDefault();
    if (onOpenTechnician) {
      onOpenTechnician(tab);
    } else {
      const url = tab === 'register' ? '/technician?tab=register' : '/technician';
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="technicians"
      className="py-16 md:py-20 bg-white border-t border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 border border-slate-200 p-7 sm:p-10 lg:p-12">

          {/* Left: proposition */}
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-4">
              <Wrench className="w-3.5 h-3.5 text-navy" aria-hidden="true" />
              Partner with Nivaro
            </p>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight leading-tight mb-4">
              For Electricians &amp; Plumbers in Chirala
            </h2>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-7">
              Are you a skilled electrician or plumber in Chirala? Join our local network to receive service requests in Paparajuthota, Perala, Kothapeta, and Srinivas Colony.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 pt-5 text-sm font-semibold text-navy">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-navy" aria-hidden="true" />
                <span>Direct customer settlement</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-navy" aria-hidden="true" />
                <span>Neighbourhood-based dispatch</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-navy" aria-hidden="true" />
                <span>Reviewed local network</span>
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Technician portal
            </p>
            <h3 className="text-xl font-bold text-navy mb-2">
              Sign in or register your trade.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              New registrations are reviewed by our team before job requests are shared. Keep your
              trade details and service area up to date in the portal.
            </p>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <a
                href="/technician"
                onClick={(e) => handleNavigate(e, 'login')}
                className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-navy hover:bg-navy-raised border border-navy text-white font-bold text-sm sm:text-base transition-colors cursor-pointer min-h-[48px] text-center"
              >
                <LogIn className="w-4 h-4 text-white" aria-hidden="true" />
                <span>Technician Login</span>
              </a>

              <a
                href="/technician?tab=register"
                onClick={(e) => handleNavigate(e, 'register')}
                className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-gold hover:bg-gold-hover text-navy font-bold text-sm sm:text-base border border-navy transition-colors cursor-pointer min-h-[48px] text-center"
              >
                <UserPlus className="w-4 h-4 text-navy" aria-hidden="true" />
                <span>Join as a Partner / Sign Up</span>
              </a>
            </div>

            <p className="text-xs text-slate-600 mt-6 leading-relaxed">
              Need assistance joining? Call the Chirala coordinator desk at{' '}
              <a
                href="tel:+919491242781"
                className="font-bold text-navy hover:text-navy/80 underline decoration-gold decoration-2 underline-offset-2"
              >
                +91 94912 42781
              </a>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
