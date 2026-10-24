import React from 'react';

const FAQS = [
  {
    question: 'How is the price of a repair decided?',
    answer:
      'Every visit starts with an on-site inspection. The technician explains a clear quote covering labour and any required replacement parts before work begins. You then pay the technician directly after the job is completed.',
  },
  {
    question: 'Who will come to my home?',
    answer:
      'Local electricians and plumbers register on Nivaro and are reviewed and approved by our team before they can take bookings. Your job is assigned to an approved technician for your neighbourhood.',
  },
  {
    question: 'When and how do I pay?',
    answer:
      'There is no advance platform payment. Once the repair is complete, you settle the agreed amount directly with the technician by cash or UPI. Any parts used are included in the quote you approve on site.',
  },
  {
    question: 'Can I cancel or reschedule a booking?',
    answer:
      'You can cancel free of charge before a technician is dispatched. If a technician has already been assigned or is on the way, call the support desk and the team will help you update or cancel the visit.',
  },
  {
    question: 'Which parts of Chirala do you cover?',
    answer:
      'We currently dispatch across Paparajuthota, Perala, Kothapeta, Srinivas Colony and Vadarevu. If your street is just outside these areas, call the helpline to confirm coverage before booking.',
  },
  {
    question: 'What if I need help after the visit?',
    answer:
      'Call or email the Chirala support desk with your booking reference. The team will review the job with the technician and help arrange a follow-up where appropriate.',
  },
];

export const TrustSupport: React.FC = () => {
  return (
    <section id="help" className="py-16 md:py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* Left: heading and support details */}
          <div className="lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-3">
              Help and support
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3">
              Questions, answered.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
              The details below match how bookings actually work. If something is still unclear, the
              local desk is a phone call away.
            </p>

            <div className="border-t border-slate-300 pt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                Chirala support desk
              </p>
              <a
                href="tel:+919491242781"
                className="block text-xl font-extrabold text-navy hover:text-navy/80 transition-colors"
              >
                +91 94912 42781
              </a>
              <a
                href="mailto:contact@nivaro.in"
                className="mt-1 inline-block text-sm font-semibold text-slate-600 underline decoration-gold decoration-2 underline-offset-4 hover:text-navy transition-colors"
              >
                contact@nivaro.in
              </a>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                  <dt className="text-slate-600">Hours</dt>
                  <dd className="font-semibold text-navy text-right">Daily, 8:00 AM &ndash; 7:30 PM</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                  <dt className="text-slate-600">Dispatch area</dt>
                  <dd className="font-semibold text-navy text-right">Chirala, Andhra Pradesh</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                  <dt className="text-slate-600">Booking changes</dt>
                  <dd className="font-semibold text-navy text-right">Free before dispatch</dd>
                </div>
              </dl>

              <a
                href="tel:+919491242781"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-navy text-white font-bold text-sm hover:bg-navy-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[44px]"
              >
                Call the support desk
              </a>
            </div>
          </div>

          {/* Right: native FAQ accordion */}
          <div className="lg:col-span-7 border-t border-slate-300">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group border-b border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 sm:py-5 text-left text-sm sm:text-base font-bold text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <svg
                    className="h-4 w-4 shrink-0 text-navy transition-transform group-open:rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 pr-8 text-sm text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
