import React from 'react';
import { Navbar } from '../components/Navbar';
import { Services } from '../components/Services';
import { Footer } from '../components/Footer';
import { LegalPolicyTab } from '../components/LegalPolicyModal';
import { ServiceCategory } from '../types';
import {
  SITE,
  SERVICE_AREAS,
  SeoInput,
  breadcrumbLd,
  businessLd,
  faqLd,
  serviceLd,
  useSeo,
} from '../lib/seo';

const FAQS = [
  {
    question: 'Which areas of Chirala does Nivaro cover?',
    answer:
      'We currently dispatch electricians and plumbers across Paparajuthota, Perala, Kothapeta, Srinivas Colony and Vadarevu. If your street sits just outside these neighbourhoods, call the helpline to confirm coverage before booking.',
  },
  {
    question: 'How is the price of a repair decided?',
    answer:
      'Every visit starts with an on-site physical inspection. The technician explains a clear quote covering labour and any required replacement parts before work begins. You settle directly with the technician after the job is completed.',
  },
  {
    question: 'Who are the technicians on Nivaro?',
    answer:
      'Technicians are local electricians and plumbers who register on Nivaro and are reviewed and approved by our team before they can take bookings. Each job is handled by an approved technician for your neighbourhood.',
  },
  {
    question: 'How do I book an electrician or plumber in Chirala?',
    answer:
      'Choose the electrical or plumbing category, pick your preferred date and neighbourhood, and confirm your contact details. We assign an approved local technician who inspects the problem and shares a quote before starting the repair.',
  },
];

const CATALOG_SEO: SeoInput = {
  title: 'Electrician & Plumber Services in Chirala | Nivaro',
  description:
    'Book an electrician or plumber in Chirala for switchboards, fans, wiring, leaking taps, pipe joints and blocked drains. Approved local technicians, on-site quotes.',
  path: '/services',
  jsonLd: [
    businessLd(),
    ...serviceLd(),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ]),
    faqLd(FAQS),
  ],
};

const VISIT_STEPS = [
  {
    number: '01',
    title: 'Send the request',
    body: 'Choose electrical or plumbing, then add your locality, address and the problem you have noticed.',
  },
  {
    number: '02',
    title: 'We call to coordinate',
    body: 'The Chirala desk confirms the visit window and assigns an approved local technician to the job.',
  },
  {
    number: '03',
    title: 'Inspect, quote, repair',
    body: 'The technician inspects the fault and explains labour and parts costs. Work starts only after you approve.',
  },
];

interface ServicesCatalogPageProps {
  onSelectService: (category: ServiceCategory, problemDescription?: string) => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerDashboard: () => void;
  onOpenPolicy: (tab: LegalPolicyTab) => void;
}

export const ServicesCatalogPage: React.FC<ServicesCatalogPageProps> = ({
  onSelectService,
  onOpenCustomerAuth,
  onOpenCustomerDashboard,
  onOpenPolicy,
}) => {
  useSeo(CATALOG_SEO);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-600 font-sans selection:bg-gold/30 selection:text-navy overflow-x-hidden">
      <Navbar
        onOpenCustomerAuth={onOpenCustomerAuth}
        onOpenCustomerDashboard={onOpenCustomerDashboard}
      />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-8 pb-14 md:pt-12 md:pb-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <li>
                  <a href="/" className="hover:text-navy transition-colors">
                    Home
                  </a>
                </li>
                <li aria-hidden="true" className="text-slate-400">
                  /
                </li>
                <li aria-current="page" className="text-navy">
                  Services
                </li>
              </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Two trades, one local team
                </p>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy leading-[1.08] mb-5">
                  Electrical &amp; plumbing repairs in Chirala.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                  Switchboards, ceiling fans and wiring faults, or leaking taps, pipe joints and
                  blocked drains. Tell us what is wrong and an approved local technician inspects it
                  before quoting.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href="#services"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-7 py-3.5 text-sm sm:text-base font-bold text-navy border border-navy hover:bg-gold-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[48px]"
                  >
                    Choose a repair
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <a
                    href={`tel:${SITE.phone}`}
                    className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-navy border border-slate-500 hover:border-navy hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[48px]"
                  >
                    Call {SITE.phoneDisplay}
                  </a>
                </div>
              </div>

              {/* Plain facts rail */}
              <div className="lg:col-span-5 w-full border border-slate-200 bg-slate-50 p-6 sm:p-7">
                <h2 className="text-base font-bold text-navy pb-4 border-b border-slate-200">
                  Before you book
                </h2>
                <dl className="divide-y divide-slate-200">
                  {[
                    {
                      term: 'Pricing',
                      detail: 'On-site quote covering labour and parts before work starts.',
                    },
                    {
                      term: 'Payment',
                      detail: 'Cash or UPI directly to the technician after completion.',
                    },
                    {
                      term: 'Coverage',
                      detail: 'Five Chirala neighbourhoods, listed below.',
                    },
                    {
                      term: 'Hours',
                      detail: 'Daily, 8:00 AM – 7:30 PM.',
                    },
                  ].map((fact) => (
                    <div key={fact.term} className="py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        {fact.term}
                      </dt>
                      <dd className="text-sm font-semibold text-navy leading-snug">{fact.detail}</dd>
                    </div>
                  ))}
                </dl>
                <p className="pt-4 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
                  No advance platform payment. Nothing is charged until the repair is finished.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Services onSelectService={onSelectService} />

        {/* How the visit works */}
        <section
          id="how-the-visit-works"
          aria-labelledby="visit-steps-heading"
          className="py-16 md:py-20 bg-slate-50 border-b border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                From request to repair
              </p>
              <h2
                id="visit-steps-heading"
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3"
              >
                How an on-site quote works
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Nivaro does not publish fixed repair prices, because the cost depends on what the
                technician finds. Here is the sequence you can expect.
              </p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 border-t border-slate-300">
              {VISIT_STEPS.map((step, index) => (
                <li
                  key={step.number}
                  className={`py-6 md:py-8 ${
                    index < VISIT_STEPS.length - 1
                      ? 'border-b md:border-b-0 md:border-r border-slate-300 md:pr-8 lg:pr-10'
                      : 'md:pl-8 lg:pl-10'
                  } ${index === 1 ? 'md:pl-8 lg:pl-10' : ''}`}
                >
                  <span className="text-xs font-bold tracking-[0.18em] text-slate-500 tabular-nums">
                    {step.number}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-navy">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>

            <p className="mt-8 text-xs text-slate-600 leading-relaxed max-w-3xl">
              Cancellations are free before a technician is dispatched. Once a technician is assigned,
              call the support desk and the team will help you reschedule or cancel.
            </p>
          </div>
        </section>

        {/* Coverage */}
        <section
          id="service-areas"
          aria-labelledby="service-areas-heading"
          className="py-16 md:py-20 bg-white border-b border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Dispatch area
                </p>
                <h2
                  id="service-areas-heading"
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3"
                >
                  Where we work in Chirala
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Service requests are coordinated from Chirala. Current coverage:
                </p>
              </div>

              <div className="lg:col-span-7 w-full">
                <ul className="border-t border-slate-200">
                  {SERVICE_AREAS.map((area, index) => (
                    <li
                      key={area}
                      className="flex items-baseline gap-4 py-3.5 border-b border-slate-200 text-sm"
                    >
                      <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-semibold text-navy">{area}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                  Just outside these areas? Call{' '}
                  <a
                    href={`tel:${SITE.phone}`}
                    className="font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:decoration-navy transition-colors"
                  >
                    {SITE.phoneDisplay}
                  </a>{' '}
                  to confirm coverage before booking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="services-faq"
          aria-labelledby="services-faq-heading"
          className="py-16 md:py-20 bg-slate-50 border-b border-slate-200"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              id="services-faq-heading"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3"
            >
              Common questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-2xl">
              Answers match how bookings and payments actually work on Nivaro.
            </p>

            <div className="border-t border-slate-300">
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
                  <p className="pb-5 pr-8 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-sm text-slate-600">
              Still unsure which service you need? Call{' '}
              <a
                href={`tel:${SITE.phone}`}
                className="font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:decoration-navy transition-colors"
              >
                {SITE.phoneDisplay}
              </a>{' '}
              or email{' '}
              <a
                href={`mailto:${SITE.email}`}
                className="font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:decoration-navy transition-colors"
              >
                {SITE.email}
              </a>
              .
            </p>
          </div>
        </section>

        {/* Closing CTA */}
        <section aria-labelledby="catalog-cta-heading" className="bg-navy">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-2xl">
                <h2
                  id="catalog-cta-heading"
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3"
                >
                  Ready to book a repair in Chirala?
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  Send the request online, or call the local desk if you would rather explain the
                  problem first. The visit is confirmed by phone before dispatch.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <a
                  href="/#booking"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-7 py-3.5 text-sm sm:text-base font-bold text-navy hover:bg-gold-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white min-h-[48px]"
                >
                  Book a Service
                  <span aria-hidden="true">&rarr;</span>
                </a>
                <a
                  href={`tel:${SITE.phone}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-400 px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:border-white hover:bg-navy-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white min-h-[48px]"
                >
                  {SITE.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        onOpenCustomerAuth={onOpenCustomerAuth}
        onOpenCustomerDashboard={onOpenCustomerDashboard}
        onOpenPolicy={onOpenPolicy}
      />
    </div>
  );
};
