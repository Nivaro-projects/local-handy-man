import React from 'react';
import { 
  Zap, 
  Droplets, 
  AlertTriangle, 
  Fan, 
  PlugZap, 
  Timer, 
  Wrench, 
  ArrowUpRight 
} from 'lucide-react';
import { ServiceCategory } from '../types';

interface CommonProblemsProps {
  onSelectProblem: (category: ServiceCategory, title: string, description: string) => void;
}

interface ProblemItem {
  id: string;
  title: string;
  category: ServiceCategory;
  categoryType: 'Electrical' | 'Plumbing';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CommonProblems: React.FC<CommonProblemsProps> = ({ onSelectProblem }) => {
  const problems: ProblemItem[] = [
    {
      id: 'mcb-tripping',
      title: 'Frequent MCB Tripping',
      category: 'Electrical Repairs',
      categoryType: 'Electrical',
      description: 'Sudden power cuts or overloaded circuit breakers in your home.',
      icon: AlertTriangle,
    },
    {
      id: 'fan-light',
      title: 'Ceiling Fan & Light Repairs',
      category: 'Electrical Repairs',
      categoryType: 'Electrical',
      description: 'Flickering tube lights, slow fans, or faulty wall regulators.',
      icon: Fan,
    },
    {
      id: 'switchboard',
      title: 'Switchboard & Socket Issues',
      category: 'Electrical Repairs',
      categoryType: 'Electrical',
      description: 'Sparking outlets, loose plugs, or dead power points.',
      icon: PlugZap,
    },
    {
      id: 'dripping-taps',
      title: 'Dripping Taps & Mixers',
      category: 'Plumbing Repairs',
      categoryType: 'Plumbing',
      description: 'Continuous water drips in kitchen sinks or bathroom fittings.',
      icon: Droplets,
    },
    {
      id: 'blocked-drains',
      title: 'Blocked Kitchen & Bath Drains',
      category: 'Plumbing Repairs',
      categoryType: 'Plumbing',
      description: 'Slow-draining sinks, floor traps, or clogged washbasins.',
      icon: Timer,
    },
    {
      id: 'pipe-leaks',
      title: 'Water Tank & Pipe Leaks',
      category: 'Plumbing Repairs',
      categoryType: 'Plumbing',
      description: 'Damp walls, leaking PVC joints, or overhead tank overflow issues.',
      icon: Wrench,
    },
  ];

  const handleCardClick = (item: ProblemItem) => {
    onSelectProblem(
      item.category,
      item.title,
      `${item.title}: ${item.description}`
    );
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="common-problems" className="py-16 md:py-24 bg-sage-light border-b border-sage-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-walnut-deep text-xs font-bold mb-3 border border-sage-border shadow-subtle">
            <span>Everyday Household Breakdowns</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-walnut-deep mb-4">
            Common Problems We Fix
          </h2>
          <p className="text-base sm:text-lg text-walnut-medium">
            Facing one of these frequent household issues? Click any card to quickly pre-fill your repair request.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((item) => {
            const Icon = item.icon;
            const isElectrical = item.categoryType === 'Electrical';
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCardClick(item)}
                className="group text-left p-6 rounded-card border border-sage-border bg-white hover:border-amber-glow hover:shadow-hover transition-all duration-200 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow cursor-pointer min-h-[160px]"
                title={`Click to request repair for ${item.title}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isElectrical 
                          ? 'bg-amber-cream text-walnut-deep border-amber-glow/40' 
                          : 'bg-sage-light text-walnut-deep border-sage-border'
                      }`}
                    >
                      {isElectrical ? (
                        <Zap className="w-3.5 h-3.5 text-amber-glow shrink-0" aria-hidden="true" />
                      ) : (
                        <Droplets className="w-3.5 h-3.5 text-sage shrink-0" aria-hidden="true" />
                      )}
                      <span>{item.categoryType}</span>
                    </span>

                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center text-walnut-deep group-hover:bg-amber-glow group-hover:text-walnut-deep transition-colors">
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cream border border-sage-border text-walnut-deep flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-walnut-deep" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-walnut-deep group-hover:text-amber-hover transition-colors">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-walnut-medium leading-relaxed pl-[3.4rem]">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-sage-border/60 flex items-center justify-between text-xs font-bold text-walnut-deep">
                  <span className="text-sage">Quick Select</span>
                  <span className="text-walnut-deep group-hover:text-amber-hover group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Pre-fill Form &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
