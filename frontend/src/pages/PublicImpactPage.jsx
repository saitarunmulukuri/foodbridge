import { useState } from 'react';
import { Button } from '../components/common/Button';
import {
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
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-4">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-4">
          Measuring Every Meal Saved & <br />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Every Community Nourished
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-[#AAB4C2] leading-relaxed max-w-2xl mx-auto">
          FoodBridge tracks verified redistribution data from donors to community organizations.
          Transparency and traceability are built directly into our donation ledger.
        </p>
      </div>

      {/* Core Impact Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
        {/* Meals Saved */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] flex items-center justify-center mb-3 border border-orange-100 dark:border-orange-500/30">
            <PackageOpen size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.totalMeals.toLocaleString()}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            Meals Redistributed
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Redirected surplus food from landfills to verified community kitchens.
          </p>
        </div>

        {/* Food Rescued */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-500/30">
            <Activity size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.totalKg.toLocaleString()} kg
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            Total Food Rescued
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Commercial edible surplus saved across prepared, produce, and bakery categories.
          </p>
        </div>

        {/* CO2 Emissions Prevented */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 border border-teal-100 dark:border-teal-500/30">
            <TreePine size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.co2SavedKg.toLocaleString()} kg
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            CO2e Prevented
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Estimated greenhouse gas emissions mitigated by preventing organic decomposition.
          </p>
        </div>

        {/* NGO Partners */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 border border-purple-100 dark:border-purple-500/30">
            <Building2 size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.activeNgos}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            Verified NGO Partners
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Active distribution shelters, soup kitchens, and community centers.
          </p>
        </div>

        {/* Volunteer Deliveries */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-500/30">
            <Truck size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.completedDonations}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            Completed Dispatches
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Successful donor pickups delivered within safe food handling timeframes.
          </p>
        </div>

        {/* Volunteer Network */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 border border-rose-100 dark:border-rose-500/30">
            <HeartHandshake size={20} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.activeVolunteers}+
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1">
            Registered Volunteers
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] leading-normal">
            Dedicated community members fulfilling crucial last-mile food transport.
          </p>
        </div>
      </div>

      {/* Sustainable Goals Banner */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm mb-12">
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F7FA] mb-2 flex items-center gap-2">
          <Globe2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span>Aligned with UN Sustainable Development Goals</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A5B1C2] leading-relaxed mb-4">
          FoodBridge directly advances SDG Target 12.3 (halving per capita global food waste)
          and SDG 2 (Zero Hunger) by creating digital coordination infrastructure for local
          communities.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] text-slate-700 dark:text-[#F5F7FA] text-xs font-semibold">
            🎯 Zero Food Waste (SDG 12.3)
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] text-slate-700 dark:text-[#F5F7FA] text-xs font-semibold">
            🥗 Zero Hunger (SDG 2)
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] text-slate-700 dark:text-[#F5F7FA] text-xs font-semibold">
            🌱 Sustainable Communities (SDG 11)
          </span>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="p-8 rounded-2xl bg-slate-900 dark:bg-[#171D25] border border-slate-800 dark:border-[#242D38] text-white text-center shadow-xl">
        <h3 className="text-xl font-bold text-white mb-2">Be Part of the Solution</h3>
        <p className="text-xs sm:text-sm text-slate-300 dark:text-[#AAB4C2] max-w-xl mx-auto mb-6">
          Whether you manage surplus food as a business, distribute meals as an NGO, or want to
          deliver food as a volunteer driver — FoodBridge needs your help.
        </p>
        <Button
          to="/register"
          variant="primary"
          size="md"
          icon={ArrowRight}
          iconPosition="right"
          className="shadow-md"
        >
          Create an Account
        </Button>
      </div>
    </div>
  );
};

export default PublicImpactPage;
