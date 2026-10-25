import React from 'react';
import { Compass, CircleDollarSign, Smartphone, LifeBuoy } from 'lucide-react';

export const WhyUs: React.FC = () => {
  const principles = [
    {
      title: 'Local focus on Chirala',
      description: 'Built specifically for households and neighborhoods across Chirala since 2026.',
      icon: Compass,
    },
    {
      title: 'Clear service charges',
      description: 'Straightforward expectations on inspection and repair costs before work begins.',
      icon: CircleDollarSign,
    },
    {
      title: 'Convenient service requests',
      description: 'Request help online in a few clicks without endless phone calls or follow-ups.',
      icon: Smartphone,
    },
    {
      title: 'Support when something goes wrong',
      description: 'A dedicated local point of contact to ensure your repair job is fully resolved.',
      icon: LifeBuoy,
    },
  ];

  return (
    <section id="about" className="py-16 md:py-24 bg-cream border-b border-sage-border scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-walnut-deep text-xs font-bold mb-3 border border-sage-border shadow-subtle">
            <span>Our Service Principles</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-walnut-deep mb-4">
            Why Nivaro?
          </h2>
          <p className="text-base sm:text-lg text-walnut-medium">
            Nivaro is built on craftsmanship, fair community pricing, and reliable service right at your doorstep.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {principles.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-8 rounded-card border border-sage-border bg-white hover:border-amber-glow hover:shadow-hover transition-all duration-200 flex gap-5 items-start"
              >
                <div className="w-13 h-13 rounded-2xl bg-amber-cream border border-amber-glow/40 flex items-center justify-center text-walnut-deep shrink-0 shadow-subtle p-3">
                  <Icon className="w-6 h-6 text-walnut-deep" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-walnut-deep mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-walnut-medium leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
