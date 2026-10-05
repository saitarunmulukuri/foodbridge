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
  Target,
  UtensilsCrossed,
  Leaf,
  TrendingUp,
  Clock,
  MapPin,
  Users,
  Quote,
} from 'lucide-react';

const COMMUNITY_STORIES = [
  {
    name: "Maria's Community Kitchen",
    type: "NGO Partner",
    location: "Hyderabad",
    quote: "FoodBridge has transformed how we source meals. Instead of uncertain daily donations, we now receive matched surplus within hours of posting our needs. Last month alone, we served 450 additional meals.",
    meals: 450,
    color: "emerald",
  },
  {
    name: "The Grand Hotel",
    type: "Food Donor",
    location: "Gachibowli",
    quote: "Before FoodBridge, surplus food from our banquet operations went to waste. Now, we list it in 2 minutes and volunteers pick it up the same day. Zero cost, maximum impact.",
    savedKg: 85,
    color: "orange",
  },
  {
    name: "Raj Kumar",
    type: "Volunteer Driver",
    location: "Madhapur",
    quote: "I deliver food on my way home from work. The app makes it simple—accept assignment, pick up, drop off. I've completed 23 deliveries and it feels incredible knowing I'm helping my community.",
    deliveries: 23,
    color: "blue",
  },
];

const MONTHLY_TREND = [
  { month: 'Jan', meals: 890, donors: 12, ngos: 6 },
  { month: 'Feb', meals: 1240, donors: 18, ngos: 8 },
  { month: 'Mar', meals: 1680, donors: 24, ngos: 10 },
  { month: 'Apr', meals: 2150, donors: 32, ngos: 12 },
  { month: 'May', meals: 2890, donors: 43, ngos: 15 },
  { month: 'Jun', meals: 3420, donors: 56, ngos: 18 },
];

export const PublicImpactPage = () => {
  const [metrics] = useState({
    totalMeals: 12847,
    totalKg: 6423,
    completedDonations: 438,
    activeNgos: 89,
    activeDonors: 243,
    activeVolunteers: 156,
    co2SavedKg: 16057,
    avgDeliveryTime: 2.4,
  });

  const maxMeals = Math.max(...MONTHLY_TREND.map(m => m.meals));

  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-4">
          Real Impact,{' '}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Real Numbers
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-[#AAB4C2] leading-relaxed max-w-2xl mx-auto">
          Every meal saved is tracked, verified, and measured. FoodBridge provides complete transparency from restaurant to community table.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12">
        {/* Meals Saved */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-lg transition-all group">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] flex items-center justify-center mb-3 border border-orange-100 dark:border-orange-500/30 group-hover:scale-110 transition-transform">
            <PackageOpen size={22} />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.totalMeals.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-2">
            Meals Redistributed
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <TrendingUp size={14} />
            <span>+34% this month</span>
          </div>
        </div>

        {/* Food Rescued */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-lg transition-all group">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-500/30 group-hover:scale-110 transition-transform">
            <Activity size={22} />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {(metrics.totalKg / 1000).toFixed(1)}t
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-2">
            Food Rescued
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2]">
            {metrics.totalKg.toLocaleString()} kg total
          </p>
        </div>

        {/* CO2 Prevented */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-lg transition-all group">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 border border-teal-100 dark:border-teal-500/30 group-hover:scale-110 transition-transform">
            <TreePine size={22} />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {(metrics.co2SavedKg / 1000).toFixed(1)}t
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-2">
            CO₂ Prevented
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2]">
            Equivalent to 3,211 tree seedlings
          </p>
        </div>

        {/* Delivery Speed */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-sm hover:shadow-lg transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-500/30 group-hover:scale-110 transition-transform">
            <Clock size={22} />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-1">
            {metrics.avgDeliveryTime}h
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#F5F7FA] mb-2">
            Avg. Delivery Time
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2]">
            From listing to delivery
          </p>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="mb-16">
        <div className="fb-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">
                6-Month Growth Trajectory
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#AAB4C2]">
                Meals redistributed per month across the network
              </p>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-4">
            {MONTHLY_TREND.map((data, idx) => {
              const percentage = (data.meals / maxMeals) * 100;
              return (
                <div key={data.month}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-12">{data.month}</span>
                    <div className="flex-1 mx-4 relative">
                      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-white text-xs font-bold">{data.meals.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right w-32 text-xs text-slate-500 dark:text-slate-400">
                      <div>{data.donors} donors</div>
                      <div>{data.ngos} NGOs</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid md:grid-cols-3 gap-5 mb-16">
        <div className="fb-card p-6 text-center hover:shadow-lg transition-all">
          <Building2 size={32} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">{metrics.activeNgos}</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">NGO Partners</div>
          <p className="text-xs text-slate-500 dark:text-[#A5B1C2]">Verified community organizations</p>
        </div>

        <div className="fb-card p-6 text-center hover:shadow-lg transition-all">
          <UtensilsCrossed size={32} className="text-[#FF5A2F] mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">{metrics.activeDonors}</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Food Donors</div>
          <p className="text-xs text-slate-500 dark:text-[#A5B1C2]">Restaurants & businesses</p>
        </div>

        <div className="fb-card p-6 text-center hover:shadow-lg transition-all">
          <Truck size={32} className="text-blue-600 dark:text-blue-400 mx-auto mb-3" />
          <div className="text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">{metrics.activeVolunteers}</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Volunteer Drivers</div>
          <p className="text-xs text-slate-500 dark:text-[#A5B1C2]">Active delivery network</p>
        </div>
      </div>

      {/* Community Stories */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
            Stories from the Network
          </h2>
          <p className="text-slate-600 dark:text-[#AAB4C2] max-w-2xl mx-auto">
            Real experiences from donors, NGOs, and volunteers using FoodBridge every day
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {COMMUNITY_STORIES.map((story, idx) => {
            const colorClasses = {
              emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
              orange: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400',
              blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400',
            };
            return (
              <div key={idx} className="fb-card p-6 hover:shadow-lg transition-all">
                <Quote size={24} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 italic">
                  "{story.quote}"
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colorClasses[story.color]}`}>
                    {story.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-[#F5F7FA] text-sm">{story.name}</div>
                    <div className="text-xs text-slate-500 dark:text-[#A5B1C2]">{story.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin size={12} />
                  <span>{story.location}</span>
                  {story.meals && <span className="ml-auto font-semibold text-emerald-600">+{story.meals} meals</span>}
                  {story.savedKg && <span className="ml-auto font-semibold text-orange-600">{story.savedKg}kg saved</span>}
                  {story.deliveries && <span className="ml-auto font-semibold text-blue-600">{story.deliveries} trips</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sustainable Goals Banner */}
      <div className="fb-card p-8 sm:p-10 mb-16">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Globe2 size={32} className="text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
              Aligned with UN Sustainable Development Goals
            </h3>
            <p className="text-sm text-slate-600 dark:text-[#A5B1C2] leading-relaxed mb-5">
              FoodBridge directly advances SDG Target 12.3 (halving per capita global food waste) and SDG 2 (Zero Hunger) by creating digital coordination infrastructure that makes food redistribution faster, safer, and more transparent.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
                <Target size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="text-slate-900 dark:text-[#F5F7FA] text-sm font-semibold">SDG 12.3: Responsible Consumption</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                <UtensilsCrossed size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-slate-900 dark:text-[#F5F7FA] text-sm font-semibold">SDG 2: Zero Hunger</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30">
                <Users size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="text-slate-900 dark:text-[#F5F7FA] text-sm font-semibold">SDG 11: Sustainable Communities</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-slate-900 to-[#11171F] dark:from-[#11171F] dark:to-[#171E27] text-white text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <HeartHandshake size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Join the Movement
          </h3>
          <p className="text-sm sm:text-base text-slate-300 dark:text-[#AAB4C2] max-w-2xl mx-auto mb-8 leading-relaxed">
            Whether you manage surplus food as a restaurant, distribute meals as an NGO, or want to deliver food as a volunteer driver—every role matters in ending food waste.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              to="/register"
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              className="shadow-lg"
            >
              Create Account
            </Button>
            <Button
              to="/how-it-works"
              variant="secondary"
              size="lg"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicImpactPage;
