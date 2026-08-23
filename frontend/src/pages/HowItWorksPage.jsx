import { Button } from '../components/common/Button';
import { InfiniteMenu } from '../components/reactbits/InfiniteMenu';
import {
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const INFINITE_MENU_ITEMS = [
  {
    title: 'Food Donor',
    description:
      'Restaurants, hotels and caterers list safe surplus food before it goes to waste.',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&h=600&fit=crop&auto=format',
    link: '/donor/create',
  },
  {
    title: 'Smart Matching',
    description:
      'The decision engine evaluates nearby NGO capacity, urgency and route feasibility.',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&h=600&fit=crop&auto=format',
    link: '/how-it-works',
  },
  {
    title: 'NGO Partner',
    description:
      'Verified NGOs receive matched donations and coordinate distribution to communities.',
    image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=600&h=600&fit=crop&auto=format',
    link: '/ngo',
  },
  {
    title: 'Volunteer Driver',
    description:
      'Volunteer drivers pick up donations and deliver them to the assigned destination.',
    image:
      'https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?q=80&w=600&h=600&fit=crop&auto=format',
    link: '/volunteer',
  },
  {
    title: 'Community Impact',
    description:
      'Good food reaches people who need it instead of becoming avoidable waste.',
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600&h=600&fit=crop&auto=format',
    link: '/impact',
  },
];

export const HowItWorksPage = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
      {/* ── 1. Hero Section ── */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 animate-fade-in">
        {/* Main Heading with high-contrast text */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-4">
          From Surplus Food to{' '}
          <span className="text-[#FF5A2F]">
            Communities in Need
          </span>
        </h1>

        {/* Description with crisp theme-aware color */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#A5B1C2] leading-relaxed max-w-2xl mx-auto font-normal">
          FoodBridge connects donors, verified NGOs and volunteer drivers
          through a smart redistribution workflow.
        </p>
      </div>

      {/* ── 2. Interactive InfiniteMenu Visual Centerpiece ── */}
      <section
        aria-label="Interactive Redistribution Workflow"
        className="mb-12 relative rounded-3xl border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#11171F] shadow-sm overflow-hidden"
      >
        <div className="h-[340px] sm:h-[390px] md:h-[440px] w-full relative">
          <InfiniteMenu items={INFINITE_MENU_ITEMS} scale={1.0} />
        </div>
      </section>

      {/* ── 3. Real-Time Decision Engine & Impact Section ── */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-[#11171F] dark:from-[#11171F] dark:to-[#171E27] text-white shadow-xl mb-12 border border-slate-800 dark:border-[#26313D] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-2">
              <Sparkles size={14} />
              <span>ALGORITHMIC REDISTRIBUTION</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              The Decision Engine in Real-Time
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-[#A5B1C2] max-w-xl leading-relaxed">
              Every surplus food post triggers automated matching calculations considering distance,
              estimated travel time, NGO meal requirements, and countdown timers to guarantee
              maximum food safety and fresh delivery.
            </p>
          </div>

          {/* CTA Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Button
              to="/register"
              variant="primary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              className="shadow-lg font-bold"
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
