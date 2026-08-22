import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Target,
  Users,
  ArrowRight,
  HelpCircle,
  Building,
} from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold mb-6">
          <UtensilsCrossed size={14} className="text-orange-500" />
          <span>Mission, Philosophy & Architecture</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Building the Digital Infrastructure for <br />
          <span className="bg-gradient-to-r from-[#FF5E3A] to-[#FF4500] bg-clip-text text-transparent">
            Zero Surplus Food Waste
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          FoodBridge is an automated redistribution platform that connects food businesses with
          verified community organizations to eliminate edible food waste through algorithmic
          coordination.
        </p>
      </div>

      {/* Problem & Solution Split Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        {/* The Problem */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
            <HelpCircle size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">The Food Waste Paradox</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            Commercial food generators (restaurants, bakeries, caterers, and supermarkets) often
            discard high-quality surplus food because the logistical burden of locating an available,
            nearby NGO before food perishes exceeds their operational capacity.
          </p>
          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Perishable food requires immediate, time-sensitive routing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Manual phone calls and coordination create severe bottlenecks.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>NGOs have fluctuating daily intake capacities.</span>
            </li>
          </ul>
        </div>

        {/* The Solution */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
            <Target size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">The FoodBridge Solution</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            FoodBridge automates the coordination layer. Donors post available food in seconds, and our
            Decision Engine algorithm scores proximity, urgency, and NGO capacity to instantly match
            and dispatch volunteers for pickup.
          </p>
          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Sub-minute automated matching using telemetry and geo-fencing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Verified NGO network with transparent chain-of-custody tracking.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Volunteer rapid-dispatch network for last-mile transit.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* The Triad Network */}
      <div className="mb-14">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Connecting the Triad</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Three interconnected stakeholder roles coordinate seamlessly on a unified platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF5A2F] flex items-center justify-center mx-auto mb-4 border border-orange-100">
              <UtensilsCrossed size={22} />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Food Donors</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kitchens, restaurants, and grocers creating surplus food listings with expiry timers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Building size={22} />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">NGO Partners</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verified community shelters, food banks, and kitchens distributing meals to beneficiaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Users size={22} />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Volunteers</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Community drivers providing critical last-mile collection and transport.
            </p>
          </div>
        </div>
      </div>

      {/* Core Engineering Principles */}
      <div className="p-8 rounded-2xl bg-slate-900 text-white shadow-xl mb-12">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Guiding Engineering Principles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          <div>
            <div className="text-xs font-mono font-bold text-orange-400 mb-1">01. SPEED</div>
            <h5 className="font-bold text-white text-sm mb-1">Perishable Urgency</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every workflow optimizes for minimal latency from kitchen to table.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-emerald-400 mb-1">02. SAFETY</div>
            <h5 className="font-bold text-white text-sm mb-1">Food Integrity</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict tracking of storage conditions, prep time, and handling protocols.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-blue-400 mb-1">03. VERIFICATION</div>
            <h5 className="font-bold text-white text-sm mb-1">Chain of Custody</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Digital ID profiles and verified receipt acknowledgments at every handoff.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-purple-400 mb-1">04. TRANSPARENCY</div>
            <h5 className="font-bold text-white text-sm mb-1">Measurable Data</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified metric logs for environmental and social impact accounting.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-md"
        >
          <span>Get Started with FoodBridge</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
