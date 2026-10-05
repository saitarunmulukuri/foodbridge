import { Button } from '../components/common/Button';
import { InfiniteMenu } from '../components/reactbits/InfiniteMenu';
import {
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Zap,
  Shield,
  AlertCircle,
  Package,
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
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-4">
          How FoodBridge{' '}
          <span className="text-[#FF5A2F]">
            Redistributes Food
          </span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-[#A5B1C2] leading-relaxed max-w-2xl mx-auto">
          A time-critical logistics platform that moves surplus food from restaurants to communities within hours—fully automated and completely free for donors.
        </p>
      </div>

      {/* Interactive Workflow Visual */}
      <section
        aria-label="Interactive Redistribution Workflow"
        className="mb-16 relative rounded-3xl border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#11171F] shadow-md overflow-hidden"
      >
        <div className="h-[340px] sm:h-[390px] md:h-[440px] w-full relative">
          <InfiniteMenu items={INFINITE_MENU_ITEMS} scale={1.0} />
        </div>
      </section>

      {/* Detailed Step-by-Step Process */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
            The Complete Journey
          </h2>
          <p className="text-slate-600 dark:text-[#AAB4C2] max-w-2xl mx-auto">
            From listing to delivery, here's exactly how surplus food reaches those who need it
          </p>
        </div>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="fb-card p-6 sm:p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center border-2 border-orange-200 dark:border-orange-500/30">
                  <UtensilsCrossed size={28} className="text-[#FF5A2F]" strokeWidth={2} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#FF5A2F] mb-2 uppercase tracking-wider">Step 1 • Food Donor</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">List Your Surplus Food</h3>
                <p className="text-slate-600 dark:text-[#AAB4C2] mb-4 leading-relaxed">
                  Restaurants, hotels, and catering businesses log into their dashboard and create a new donation listing. They specify the food type, quantity, pickup address, and most importantly—the expiry time.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Package size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Food Details:</strong> Type, quantity, dietary info</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Time Window:</strong> Expiry deadline for safety</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Pickup Location:</strong> Restaurant address</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Shield size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300"><strong>Verification:</strong> Food safety standards checked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="fb-card p-6 sm:p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border-2 border-amber-200 dark:border-amber-500/30">
                  <Zap size={28} className="text-amber-600" strokeWidth={2} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wider">Step 2 • Smart Matching</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">Automated Decision Engine</h3>
                <p className="text-slate-600 dark:text-[#AAB4C2] mb-4 leading-relaxed">
                  The moment a donation is posted, FoodBridge's algorithm evaluates all verified NGOs within service range. It calculates distance, travel time, current capacity, and dietary compatibility to find the best match.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Matching Factors:</div>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      Geographic proximity (15-30km radius)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      Estimated travel time vs. expiry deadline
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      NGO current meal capacity and requirements
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      Available volunteer drivers in the area
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="fb-card p-6 sm:p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-500/30">
                  <Building2 size={28} className="text-emerald-600" strokeWidth={2} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">Step 3 • NGO Confirmation</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">NGO Accepts Donation</h3>
                <p className="text-slate-600 dark:text-[#AAB4C2] mb-4 leading-relaxed">
                  The matched NGO receives an instant notification about the donation. They review the details and accept if they can accommodate the food. Only verified NGOs that have completed administrative review can participate.
                </p>
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                  <Shield size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900 dark:text-[#F5F7FA] mb-1">Verification Process</div>
                    <p className="text-slate-600 dark:text-slate-400">All NGOs undergo administrative verification including registration number validation, physical address confirmation, and capacity assessment before joining the network.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="fb-card p-6 sm:p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border-2 border-blue-200 dark:border-blue-500/30">
                  <Truck size={28} className="text-blue-600" strokeWidth={2} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wider">Step 4 • Volunteer Pickup & Delivery</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">Driver Completes the Journey</h3>
                <p className="text-slate-600 dark:text-[#AAB4C2] mb-4 leading-relaxed">
                  Once the NGO confirms, a volunteer driver receives the assignment. They navigate to the restaurant, collect the packaged food, and deliver it to the NGO location. Real-time tracking keeps everyone informed throughout the journey.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-bold text-blue-600 mb-1">~2-4h</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Average delivery time</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">100%</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Food safety maintained</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-bold text-[#FF5A2F] mb-1">Free</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">No cost for donors</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="fb-card p-6 sm:p-8 hover:shadow-lg transition-all border-2 border-emerald-200 dark:border-emerald-500/30">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <CheckCircle2 size={28} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">Step 5 • Impact</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">Mission Complete</h3>
                <p className="text-slate-600 dark:text-[#AAB4C2] mb-4 leading-relaxed">
                  The food reaches community members who need it. Donors receive impact confirmation, volunteers earn recognition, and NGOs document the distribution. What would have been waste becomes nourishment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Decision Engine Highlight */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-[#11171F] dark:from-[#11171F] dark:to-[#171E27] text-white shadow-xl mb-16 border border-slate-800 dark:border-[#26313D] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 mb-3 px-3 py-1.5 bg-orange-500/10 rounded-full">
                <Sparkles size={14} />
                <span>ALGORITHMIC REDISTRIBUTION</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Time-Critical Logistics Platform
              </h3>
              <p className="text-sm sm:text-base text-slate-300 dark:text-[#A5B1C2] max-w-2xl leading-relaxed mb-6">
                Every donation listing triggers real-time calculations across distance, travel time, NGO capacity, and food expiry windows. The system automatically selects the optimal match to ensure food arrives fresh and safe.
              </p>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-orange-400" />
                <span>Typical matching happens in under 30 seconds after posting.</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <Button
                to="/register"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="shadow-lg"
              >
                Join the Network
              </Button>
              <Button
                to="/about"
                variant="secondary"
                size="lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
