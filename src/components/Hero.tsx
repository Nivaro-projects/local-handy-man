import React from 'react';
import { ServiceCategory } from '../types';

interface HeroProps {
  onSelectService?: (category: ServiceCategory, problemDescription?: string) => void;
  onOpenTechnician?: (tab: 'login' | 'register') => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectService, onOpenTechnician }) => {
  const chooseService = (category: ServiceCategory, problemDescription: string) => {
    onSelectService?.(category, problemDescription);
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative pt-12 pb-16 md:pt-20 md:pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left Column: Headline, supporting copy and actions */}
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
              Chirala, Andhra Pradesh
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy leading-[1.08] mb-5">
              Electricians &amp; plumbers in Chirala.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
              Book a repair for your home and an approved local technician will inspect the problem
              on site. You get a clear quote before any work begins, then settle directly after the
              job is done.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
              <a
                href="#booking"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-gold text-navy font-bold text-sm sm:text-base border border-navy hover:bg-gold-hover shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[48px]"
              >
                <span>Book a Service</span>
                <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
              <a
                href="/technician?tab=register"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenTechnician?.('register');
                }}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-white text-navy border border-slate-500 font-semibold text-sm sm:text-base hover:border-navy hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[48px]"
              >
                Join as a Technician
              </a>
            </div>

            <a
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:decoration-navy transition-colors"
            >
              See everything we repair
              <span aria-hidden="true">&rarr;</span>
            </a>

            {/* Plain facts instead of trust badges */}
            <dl className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Pricing
                </dt>
                <dd className="text-sm font-semibold text-navy leading-snug">
                  On-site quote before work
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payment
                </dt>
                <dd className="text-sm font-semibold text-navy leading-snug">
                  Cash or UPI after completion
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Support
                </dt>
                <dd className="text-sm font-semibold text-navy leading-snug">
                  Daily, 8:00 AM &ndash; 7:30 PM
                </dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Service selector and process */}
          <div className="lg:col-span-5 w-full">
            <div className="border border-slate-200 bg-slate-50 p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-navy">What needs fixing?</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Pick a trade to pre-fill your request.
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Step 1 of 3
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => chooseService('Electrical Repairs', 'Electrical problem')}
                  className="group border border-slate-300 bg-white p-4 text-left transition-colors hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Electrical
                  </span>
                  <span className="block text-sm font-bold text-navy mt-1 leading-snug">
                    Switches, fans, wiring and fittings
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-navy">
                    Start request
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseService('Plumbing Repairs', 'Plumbing problem')}
                  className="group border border-slate-300 bg-white p-4 text-left transition-colors hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Plumbing
                  </span>
                  <span className="block text-sm font-bold text-navy mt-1 leading-snug">
                    Taps, leaks, drains and tank fittings
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-navy">
                    Start request
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                  </span>
                </button>
              </div>

              <ol className="mt-6 border-t border-slate-200 divide-y divide-slate-200">
                <li className="flex gap-3 py-3.5">
                  <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0 pt-0.5">01</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-navy font-semibold">Send the request</strong> &mdash; choose the
                    trade, date and time window, then add your Chirala address.
                  </p>
                </li>
                <li className="flex gap-3 py-3.5">
                  <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0 pt-0.5">02</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-navy font-semibold">We call to coordinate</strong> &mdash; our
                    local desk confirms the visit with an approved technician.
                  </p>
                </li>
                <li className="flex gap-3 py-3.5">
                  <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0 pt-0.5">03</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-navy font-semibold">Inspect, quote, repair</strong> &mdash; you
                    approve the on-site quote, then pay the technician directly.
                  </p>
                </li>
              </ol>

              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">Prefer to talk it through?</span>
                <a
                  href="tel:+919491242781"
                  className="font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:decoration-navy transition-colors"
                >
                  +91 94912 42781
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
