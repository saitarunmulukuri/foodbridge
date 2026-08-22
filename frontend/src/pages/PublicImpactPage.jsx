import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  PackageOpen,
  Building2,
  Truck,
  HeartHandshake,
  ArrowRight,
  Activity,
  Globe2,
  TreePine,
} from 'lucide-react';

export const PublicImpactPage = () => {
  const [metrics] = useState({
    totalMeals: 1420,
    totalKg: 710,
    completedDonations: 48,
    activeNgos: 12,
    activeVolunteers: 18,
    co2SavedKg: 1775,
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-6">
          <TrendingUp size={14} className="text-emerald-600" />
          <span>Verified Platform Impact Ledger</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Measuring Every Meal Saved & <br />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Every Community Nourished
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          FoodBridge tracks verified redistribution data from donors to community organizations.
          Transparency and traceability are built directly into our donation ledger.
        </p>
      </div>

      {/* Core Impact Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
        {/* Meals Saved */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5A2F] flex items-center justify-center mb-3 border border-orange-100">
            <PackageOpen size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.totalMeals.toLocaleString()}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Meals Redistributed
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Redirected surplus food from landfills to verified community kitchens.
          </p>
        </div>

        {/* Food Rescued */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
            <Activity size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.totalKg.toLocaleString()} kg
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Total Food Rescued
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Commercial edible surplus saved across prepared, produce, and bakery categories.
          </p>
        </div>

        {/* CO2 Emissions Prevented */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 border border-teal-100">
            <TreePine size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.co2SavedKg.toLocaleString()} kg
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            CO2e Prevented
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Estimated greenhouse gas emissions mitigated by preventing organic decomposition.
          </p>
        </div>

        {/* NGO Partners */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 border border-purple-100">
            <Building2 size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.activeNgos}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Verified NGO Partners
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Active distribution shelters, soup kitchens, and community centers.
          </p>
        </div>

        {/* Volunteer Deliveries */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
            <Truck size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.completedDonations}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Completed Dispatches
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Successful donor pickups delivered within safe food handling timeframes.
          </p>
        </div>

        {/* Volunteer Network */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-100">
            <HeartHandshake size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {metrics.activeVolunteers}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Registered Volunteers
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Dedicated community members fulfilling crucial last-mile food transport.
          </p>
        </div>
      </div>

      {/* Sustainable Goals Banner */}
      <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm mb-12">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Globe2 size={18} className="text-emerald-600" />
          <span>Aligned with UN Sustainable Development Goals</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
          FoodBridge directly advances SDG Target 12.3 (halving per capita global food waste)
          and SDG 2 (Zero Hunger) by creating digital coordination infrastructure for local
          communities.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            🎯 Zero Food Waste (SDG 12.3)
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            🥗 Zero Hunger (SDG 2)
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            🌱 Sustainable Communities (SDG 11)
          </span>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="p-8 rounded-2xl bg-slate-900 text-white text-center shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Be Part of the Solution</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6">
          Whether you manage surplus food as a business, distribute meals as an NGO, or want to
          deliver food as a volunteer driver — FoodBridge needs your help.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF5A2F] text-white font-bold text-xs hover:bg-[#e04420] transition shadow-md"
        >
          <span>Create Account & Join Network</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default PublicImpactPage;
