import React from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Submit your service request',
    description:
      'Choose electrical or plumbing, pick your preferred date and time window, and add your Chirala neighbourhood and street address.',
  },
  {
    number: '02',
    title: 'Local technician coordination',
    description:
      'Our Chirala desk reviews the request and coordinates with an approved technician near your area, who calls to confirm the visit.',
  },
  {
    number: '03',
    title: 'On-site assessment and completion',
    description:
      'The technician inspects the problem, explains the labour and parts quote, completes the repair, and you settle directly on site.',
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* Left: section heading and policy notes */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy leading-tight mb-4">
              From request to repair in three steps.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              No call-centre runaround. A local desk coordinates the visit, and the technician who
              turns up quotes the job before starting.
            </p>

            <div className="space-y-3 border-t border-slate-200 pt-5 text-xs text-slate-600">
              <p className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                Zero advance booking or platform deposit.
              </p>
              <p className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                Pay the technician directly by cash or UPI after the work.
              </p>
              <p className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                Cancel free of charge before a technician is dispatched.
              </p>
            </div>

            <a
              href="#booking"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:decoration-navy transition-colors"
            >
              Start a booking
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {/* Right: numbered process */}
          <ol className="lg:col-span-8 border-t border-slate-300">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="grid grid-cols-[auto,1fr] gap-5 sm:gap-8 py-7 sm:py-8 border-b border-slate-200"
              >
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy/25 tabular-nums leading-none pt-0.5">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

        </div>
      </div>
    </section>
  );
};
