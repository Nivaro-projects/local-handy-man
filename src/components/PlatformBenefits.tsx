import React from 'react';

const HOME_BENEFITS = [
  {
    title: 'On-site inspection',
    description: 'The technician examines the issue in person and quotes labour and parts before starting.',
  },
  {
    title: 'No advance platform payment',
    description: 'You pay only after the work is inspected and completed, directly to the technician.',
  },
  {
    title: 'Local follow-up',
    description: 'The Chirala support desk helps if a booking needs an update or a follow-up visit.',
  },
];

const TECHNICIAN_BENEFITS = [
  {
    title: 'Work near home',
    description: 'Receive requests from the Chirala neighbourhoods you already serve.',
  },
  {
    title: 'Direct settlement',
    description: 'Collect the agreed payment directly from the customer when the job is complete.',
  },
  {
    title: 'Clear coordination',
    description: 'The local desk handles scheduling and support so you can focus on the repair.',
  },
];

export const PlatformBenefits: React.FC = () => {
  return (
    <section id="benefits" className="py-16 md:py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-3">
            A local model
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3">
            Built for Chirala homes and tradespeople.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Nivaro is a coordination service, not a call centre. Households get a local point of
            contact, and independent electricians and plumbers get job requests in their own area.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-200">
          <div className="py-8 md:pr-10 lg:pr-14 border-b md:border-b-0 md:border-r border-slate-200">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <h3 className="text-xl font-bold text-navy">For homeowners</h3>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chirala households
              </span>
            </div>
            <dl className="space-y-4">
              {HOME_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  <dt className="text-sm font-bold text-navy mb-1">{benefit.title}</dt>
                  <dd className="text-sm text-slate-600 leading-relaxed">{benefit.description}</dd>
                </div>
              ))}
            </dl>
            <a
              href="#booking"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:decoration-navy transition-colors"
            >
              Book a service for your home
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          <div className="py-8 md:pl-10 lg:pl-14">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <h3 className="text-xl font-bold text-navy">For technicians</h3>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Local tradespeople
              </span>
            </div>
            <dl className="space-y-4">
              {TECHNICIAN_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  <dt className="text-sm font-bold text-navy mb-1">{benefit.title}</dt>
                  <dd className="text-sm text-slate-600 leading-relaxed">{benefit.description}</dd>
                </div>
              ))}
            </dl>
            <a
              href="/technician"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:decoration-navy transition-colors"
            >
              Technician portal and onboarding
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
