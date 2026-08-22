import {
  UtensilsCrossed,
  ShieldCheck,
  Zap,
  Truck,
  HeartHandshake,
  TrendingUp,
} from 'lucide-react';

export const HomePage = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-14 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold mb-6">
          <Zap size={14} className="text-orange-500" />
          <span>Intelligent Surplus Food Redistribution</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
          Bridging Surplus Food to <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#FF5E3A] to-[#FF4500] bg-clip-text text-transparent">
            Communities in Need
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-4">
          FoodBridge connects food donors, verified NGOs, and volunteer drivers to eliminate
          edible food waste through automated decision engine logistics.
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {/* Donor */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF5A2F] flex items-center justify-center mb-4 border border-orange-100">
            <UtensilsCrossed size={22} strokeWidth={2.2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">1. Food Donors</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Restaurants, bakeries, and caterers quickly log surplus food with quantities, dietary
            tags, and safe expiry windows.
          </p>
        </div>

        {/* Decision Engine */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
            <Zap size={22} strokeWidth={2.2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">2. Decision Engine</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Automated scoring evaluates nearby verified NGO capacity, urgency, and route feasibility
            to dispatch food before spoilage.
          </p>
        </div>

        {/* Volunteers & NGOs */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
            <Truck size={22} strokeWidth={2.2} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">3. Rapid Distribution</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Volunteer drivers pick up donations and deliver them to community kitchens, shelters, and
            local distribution hubs.
          </p>
        </div>
      </div>

      {/* Platform Features / Guarantees */}
      <div className="p-8 rounded-2xl bg-slate-900 text-white shadow-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-orange-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">100% Verified Partners</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                All NGO distribution centers and donors undergo safety and operational checks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">Real-Time Tracking</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Live lifecycle tracking from donation post to volunteer pickup and NGO confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-blue-400">
              <HeartHandshake size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">Zero Waste Mission</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Redirecting perishable nutrition to prevent environmental emissions and hunger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
