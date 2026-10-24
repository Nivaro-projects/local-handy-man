import React, { useState } from 'react';
import { ServiceCategory } from '../types';

interface ServicesProps {
  onSelectService: (category: ServiceCategory, problemDescription?: string) => void;
}

interface ProblemItem {
  key: string;
  label: string;
  description: string;
}

const ELECTRICAL_PROBLEMS: ProblemItem[] = [
  {
    key: 'switch',
    label: 'Switches, power sockets & MCB breakers',
    description: 'Switch or socket is not working',
  },
  {
    key: 'fan',
    label: 'Ceiling fans, exhaust fans & lighting',
    description: 'Fan is not working',
  },
  {
    key: 'wiring',
    label: 'Wiring faults & short-circuit checks',
    description: 'Electrical problem',
  },
  {
    key: 'appliance',
    label: 'Geyser, inverter & appliance connections',
    description: 'Electrical problem',
  },
];

const PLUMBING_PROBLEMS: ProblemItem[] = [
  {
    key: 'tap',
    label: 'Leaking taps, mixers & showerheads',
    description: 'Tap repair required',
  },
  {
    key: 'pipe',
    label: 'Pipe repairs, joints & supply line leaks',
    description: 'Water leakage problem',
  },
  {
    key: 'drain',
    label: 'Drainage clearing & sink blockage removal',
    description: 'Plumbing problem',
  },
  {
    key: 'tank',
    label: 'Overhead tank float valves & pump fittings',
    description: 'Plumbing problem',
  },
];

export const Services: React.FC<ServicesProps> = ({ onSelectService }) => {
  const [selectedKey, setSelectedKey] = useState<string>('');

  const handleSelect = (key: string, category: ServiceCategory, problemDescription: string) => {
    setSelectedKey(key);
    onSelectService(category, problemDescription);
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderProblemList = (items: ProblemItem[], category: ServiceCategory) => (
    <ul className="border-t border-slate-200">
      {items.map((item) => {
        const isSelected = selectedKey === item.key;
        return (
          <li key={item.key} className="border-b border-slate-100">
            <button
              type="button"
              onClick={() => handleSelect(item.key, category, item.description)}
              aria-pressed={isSelected}
              className={`group flex w-full items-center justify-between gap-4 py-3 text-left text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                isSelected ? 'text-navy font-semibold' : 'text-slate-600 hover:text-navy'
              }`}
            >
              <span>{item.label}</span>
              <span className="shrink-0 text-xs" aria-hidden="true">
                {isSelected ? (
                  <svg className="h-4 w-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-slate-400 transition-transform group-hover:translate-x-0.5">&rarr;</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section id="services" className="py-16 md:py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 pb-8 border-b border-slate-200">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-3">
              Electrical &amp; plumbing
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3">
              Choose a repair category
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Two trades, one local team. Select a common issue to pre-fill your booking, or start
              with the category and describe the problem yourself.
            </p>
          </div>
          <p className="max-w-xs text-sm text-slate-600 leading-relaxed border-l-2 border-gold pl-4">
            Every visit begins with an on-site inspection and a clear labour and parts quote before
            work starts.
          </p>
        </div>

        {/* Two service columns */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {[
            {
              key: 'electrical',
              number: '01',
              trade: 'Electrical',
              title: 'Electrical repairs',
              description:
                'Troubleshooting and repair for household fixtures, switchboards, wiring and appliance connections.',
              items: ELECTRICAL_PROBLEMS,
              category: 'Electrical Repairs' as ServiceCategory,
              cta: 'Book electrical repairs',
            },
            {
              key: 'plumbing',
              number: '02',
              trade: 'Plumbing',
              title: 'Plumbing repairs',
              description:
                'Repair for household water lines, sanitary fixtures, dripping taps, tank fittings and drainage.',
              items: PLUMBING_PROBLEMS,
              category: 'Plumbing Repairs' as ServiceCategory,
              cta: 'Book plumbing repairs',
            },
          ].map((service, index) => (
            <div
              key={service.key}
              className={`py-8 md:py-10 ${
                index === 0
                  ? 'md:pr-10 lg:pr-14 border-b md:border-b-0 md:border-r border-slate-200'
                  : 'md:pl-10 lg:pl-14'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
                    {service.number} &middot; {service.trade}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-navy">{service.title}</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 pt-1">
                  {service.trade === 'Electrical' ? 'EL' : 'PL'}
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {service.description}
              </p>

              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
                Common repairs
              </h4>
              {renderProblemList(service.items, service.category)}

              <button
                type="button"
                onClick={() =>
                  handleSelect(service.key, service.category, `${service.trade} problem`)
                }
                className="mt-7 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-gold text-navy border border-navy font-bold text-sm hover:bg-gold-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer min-h-[48px]"
              >
                <span>{service.cta}</span>
                <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* On-site estimate note */}
        <div className="max-w-3xl mt-10 border-l-2 border-gold pl-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-navy">How pricing works:</strong> the assigned technician inspects
            the problem in person and explains the labour and replacement-part costs before any work
            begins. You pay the technician directly after completion, by cash or UPI &mdash; no advance
            platform payment.
          </p>
        </div>

      </div>
    </section>
  );
};
