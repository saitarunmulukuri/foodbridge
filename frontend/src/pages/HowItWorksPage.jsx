import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Cpu,
  Building2,
  Truck,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Food Donor Logs Surplus',
    role: 'Food Donor',
    badgeColor: '#FF5A2F',
    badgeBg: '#FFF4F2',
    icon: UtensilsCrossed,
    description:
      'Commercial donors (restaurants, bakeries, event organizers) create a surplus listing with food type, portion count, safe storage requirements, and expiry countdown.',
    details: [
      'Configurable shelf-life timer and urgent pickup windows',
      'Dietary classification (Vegetarian, Non-Veg, Bakery, Raw)',
      'Automated pickup address and contact assignment',
    ],
  },
  {
    step: '02',
    title: 'Decision Engine Evaluation',
    role: 'Algorithmic Matching',
    badgeColor: '#8B5CF6',
    badgeBg: '#F5F3FF',
    icon: Cpu,
    description:
      'The FoodBridge Decision Engine analyzes multi-factor telemetry to score nearby NGO partners based on distance, capacity, dietary fit, and shelf-life urgency.',
    details: [
      'Geo-spatial proximity radius scoring',
      'NGO operational hours and consumption capacity checks',
      'Expiry-weighted priority routing to avoid spoilage',
    ],
  },
  {
    step: '03',
    title: 'NGO Partner Notification & Match',
    role: 'NGO Partner',
    badgeColor: '#10B981',
    badgeBg: '#F0FDF4',
    icon: Building2,
    description:
      'The highest-scoring NGO receives an immediate match alert with complete food details, pickup instructions, and time window.',
    details: [
      'Instant notification with accept/decline action',
      'Direct coordination with donor kitchen instructions',
      'Automatic fallback routing if NGO capacity is exceeded',
    ],
  },
  {
    step: '04',
    title: 'Volunteer Driver Dispatch',
    role: 'Volunteer Network',
    badgeColor: '#3B82F6',
    badgeBg: '#EFF6FF',
    icon: Truck,
    description:
      'When NGO or donor transport is required, verified volunteer drivers in the vicinity are dispatched to manage the physical pickup.',
    details: [
      'Turn-by-turn pickup and drop-off navigation',
      'Digital verification badge for donor gate access',
      'Real-time status updates: Accepted → En Route → Picked Up',
    ],
  },
  {
    step: '05',
    title: 'Safe Transit & Delivery',
    role: 'Chain of Custody',
    badgeColor: '#F59E0B',
    badgeBg: '#FFFBEB',
    icon: MapPin,
    description:
      'The volunteer transports the surplus food following safe handling guidelines directly to the designated community kitchen or distribution site.',
    details: [
      'Temperature and handling integrity compliance',
      'ETA alerts sent to receiving NGO staff',
      'Secure photo / signature handover confirmation',
    ],
  },
  {
    step: '06',
    title: 'Verification & Lifecycle Completion',
    role: 'Completed Cycle',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    icon: CheckCircle2,
    description:
      'Both donor and NGO confirm delivery. The donation lifecycle reaches COMPLETED, and verified environmental & hunger-relief impact is added to the ledger.',
    details: [
      'Kg of food saved & meals created recorded in real time',
      'CO2 emission prevention calculation',
      'Tax & compliance redistribution receipts generated',
    ],
  },
];

export const HowItWorksPage = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold mb-6">
          <Layers size={14} className="text-orange-500" />
          <span>Platform Architecture & Redistribution Lifecycle</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          How FoodBridge Redistributes <br />
          <span className="bg-gradient-to-r from-[#FF5E3A] to-[#FF4500] bg-clip-text text-transparent">
            Surplus Meals in 6 Steps
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          From kitchen surplus to community dining tables — our automated matching engine and
          volunteer logistics ensure zero food goes to waste.
        </p>
      </div>

      {/* 6 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        {WORKFLOW_STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STEP {s.step}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                    style={{
                      color: s.badgeColor,
                      backgroundColor: s.badgeBg,
                      borderColor: `${s.badgeColor}30`,
                    }}
                  >
                    {s.role}
                  </span>
                </div>

                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: s.badgeBg,
                      color: s.badgeColor,
                      borderColor: `${s.badgeColor}30`,
                    }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {s.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {s.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <ul className="space-y-1.5">
                  {s.details.map((d, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-slate-500 flex items-center gap-2"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.badgeColor }}
                      />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Engine Highlight Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl mb-12 border border-slate-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-2">
              <Sparkles size={14} />
              <span>Algorithmic Optimization</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              The Decision Engine in Real-Time
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Every surplus food post triggers automated matching calculations considering distance,
              estimated travel time, NGO meal requirements, and countdown timers to guarantee
              maximum food safety and fresh delivery.
            </p>
          </div>

          <Link
            to="/register"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#FF5A2F] text-white font-bold text-xs hover:bg-[#e04420] transition shadow-lg"
          >
            <span>Join FoodBridge</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
