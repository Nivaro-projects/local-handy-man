import React from 'react';
import { Phone, CalendarCheck, ShieldCheck } from 'lucide-react';

export const CallToActionBanner: React.FC = () => {
  return (
    <section 
      style={{ backgroundColor: '#FDF6E4' }}
      className="py-16 md:py-20 w-full text-walnut-deep border-t-2 border-b-2 border-walnut-deep relative z-10 block opacity-100 visible"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          style={{ backgroundColor: '#FFFFFF', borderColor: '#4A251D' }}
          className="border-2 rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-hover"
        >
          
          <div className="max-w-2xl text-left">
            <div 
              style={{ backgroundColor: '#EEF3EF', borderColor: '#5F7D6B', color: '#4A251D' }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold mb-4"
            >
              <ShieldCheck className="w-4 h-4 text-sage" aria-hidden="true" />
              <span>Prompt Local Assistance Across Chirala</span>
            </div>

            <h2 
              style={{ color: '#4A251D' }}
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
            >
              Need Electrical or Plumbing Repairs Today?
            </h2>

            <p 
              style={{ color: '#4A251D' }}
              className="text-base sm:text-lg leading-relaxed mb-6 font-medium"
            >
              Our skilled technicians at Nivaro are ready to assist. Call us directly or submit your repair request online.
            </p>

            <div 
              style={{ color: '#4A251D' }}
              className="flex flex-wrap gap-4 text-xs sm:text-sm font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage" /> Quick turnaround in Chirala
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage" /> On-site estimates before work begins
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage" /> Experienced local professionals
              </span>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row gap-3.5">
            <a
              href="tel:+919491242781"
              style={{ backgroundColor: '#E59838', color: '#4A251D', borderColor: '#4A251D' }}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border-2 font-extrabold text-base hover:brightness-105 transition-all shadow-subtle min-h-[44px]"
            >
              <Phone className="w-5 h-5 text-walnut-deep" aria-hidden="true" />
              <span>+91 94912 42781</span>
            </a>

            <a
              href="#booking"
              style={{ backgroundColor: '#4A251D', color: '#FFFFFF' }}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-base hover:bg-walnut-medium transition-all shadow-hover min-h-[44px]"
            >
              <CalendarCheck className="w-5 h-5 text-amber-glow" aria-hidden="true" />
              <span>Book Service</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
};
