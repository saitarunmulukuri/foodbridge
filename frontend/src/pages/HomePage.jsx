import {
  UtensilsCrossed,
  ShieldCheck,
  Zap,
  Truck,
  Building2,
  Heart,
  Recycle,
} from 'lucide-react';
import { OrbitingCircles } from '../components/magicui/OrbitingCircles';

export const HomePage = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-4">
          Bridging Surplus Food to <br className="hidden sm:inline" />
          <span className="text-[#FF5A2F]">
            Communities in Need
          </span>
        </h1>

        {/* Orbiting FoodBridge Ecosystem Visual */}
        <div className="relative flex h-[260px] sm:h-[290px] w-full max-w-[310px] mx-auto items-center justify-center overflow-hidden my-3">
          {/* Center FoodBridge Brand Hub */}
          <div
            className="relative z-10 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5A2F] to-[#E04420] text-white shadow-md shadow-orange-500/20 border-2 border-white"
            title="FoodBridge Platform"
          >
            <UtensilsCrossed size={22} strokeWidth={2.2} className="shrink-0" />
          </div>

          {/* Inner Orbit (Radius 62, 20s Duration, Clockwise) */}
          <OrbitingCircles
            radius={62}
            duration={20}
            iconSize={32}
            className="bg-white/95 dark:bg-slate-800 hover:scale-110 transition-transform"
          >
            <div title="Surplus Food Listing" className="flex items-center justify-center text-[#FF5A2F]">
              <UtensilsCrossed size={14} strokeWidth={2.2} />
            </div>
            <div title="Decision Engine" className="flex items-center justify-center text-amber-500">
              <Zap size={14} strokeWidth={2.2} />
            </div>
            <div title="Community Impact" className="flex items-center justify-center text-rose-500">
              <Heart size={14} strokeWidth={2.2} />
            </div>
          </OrbitingCircles>

          {/* Outer Orbit (Radius 116, 24s Duration, Counter-Clockwise) */}
          <OrbitingCircles
            radius={116}
            duration={24}
            reverse
            iconSize={34}
            className="bg-white/95 dark:bg-slate-800 hover:scale-110 transition-transform"
          >
            <div title="Verified NGOs" className="flex items-center justify-center text-emerald-600">
              <Building2 size={15} strokeWidth={2.1} />
            </div>
            <div title="Volunteer Logistics" className="flex items-center justify-center text-blue-600">
              <Truck size={15} strokeWidth={2.1} />
            </div>
            <div title="Safety Verification" className="flex items-center justify-center text-indigo-600">
              <ShieldCheck size={15} strokeWidth={2.1} />
            </div>
            <div title="Zero Waste Redistribution" className="flex items-center justify-center text-teal-600">
              <Recycle size={15} strokeWidth={2.1} />
            </div>
          </OrbitingCircles>
        </div>

        <p className="text-base sm:text-lg text-slate-600 dark:text-[#AAB4C2] leading-relaxed mb-4">
          FoodBridge connects food donors, verified NGOs, and volunteer drivers to eliminate
          edible food waste through automated decision engine logistics.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
