import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShieldCheck,
  Zap,
  Truck,
  Building2,
  Heart,
  Recycle,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  TrendingUp,
  Leaf,
} from 'lucide-react';
import { OrbitingCircles } from '../components/magicui/OrbitingCircles';
import { Button } from '../components/common/Button';

export const HomePage = () => {
  return (
    <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 px-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight leading-tight mb-5">
          Connect Surplus Food to{' '}
          <span className="text-[#FF5A2F]">
            Those Who Need It
          </span>
        </h1>

        {/* Orbiting FoodBridge Ecosystem Visual */}
        <div className="relative flex h-[260px] sm:h-[290px] w-full max-w-[310px] mx-auto items-center justify-center overflow-hidden my-8">
          {/* Center FoodBridge Brand Hub */}
          <div
            className="relative z-10 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5A2F] to-[#E04420] text-white shadow-md shadow-orange-500/20 border-2 border-white dark:border-slate-800"
            title="FoodBridge Platform"
          >
            <UtensilsCrossed size={22} strokeWidth={2.2} className="shrink-0" />
          </div>

          {/* Inner Orbit */}
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

          {/* Outer Orbit */}
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

        <p className="text-base sm:text-lg text-slate-600 dark:text-[#AAB4C2] leading-relaxed mb-8 max-w-2xl mx-auto">
          FoodBridge is a logistics platform connecting restaurants, hotels, and food businesses with local NGOs and volunteer drivers to redistribute surplus food before it expires.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            to="/register"
            variant="primary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
          >
            Get Started
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

      {/* Real-time Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16 animate-fade-in-up">
        {[
          { label: 'Meals Saved', value: '12,847', icon: UtensilsCrossed, color: 'text-[#FF5A2F]' },
          { label: 'Active Donors', value: '243', icon: Building2, color: 'text-emerald-600' },
          { label: 'NGO Partners', value: '89', icon: Heart, color: 'text-rose-500' },
          { label: 'Volunteer Drivers', value: '156', icon: Truck, color: 'text-blue-600' },
        ].map((stat, idx) => (
          <div key={idx} className="fb-card p-5 text-center group hover:shadow-lg transition-all duration-300">
            <stat.icon size={24} className={`${stat.color} mx-auto mb-2`} />
            <div className="text-2xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">{stat.value}</div>
            <div className="text-xs text-slate-500 dark:text-[#AAB4C2] font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Key Features */}
      <div className="mb-16 animate-fade-in-up">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
            How FoodBridge Works
          </h2>
          <p className="text-slate-600 dark:text-[#AAB4C2] max-w-2xl mx-auto">
            A seamless three-step process that gets surplus food from your kitchen to communities in need within hours
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'List Your Surplus',
              description: 'Food businesses post available surplus meals with pickup details and expiry times. Our system validates food safety standards.',
              icon: UtensilsCrossed,
              color: 'bg-orange-50 dark:bg-orange-500/10',
              iconColor: 'text-[#FF5A2F]',
            },
            {
              step: '2',
              title: 'Smart Matching',
              description: 'Our decision engine automatically matches your donation with nearby verified NGOs based on capacity, location, and dietary requirements.',
              icon: Zap,
              color: 'bg-amber-50 dark:bg-amber-500/10',
              iconColor: 'text-amber-600',
            },
            {
              step: '3',
              title: 'Volunteer Delivery',
              description: 'Verified volunteer drivers pick up and deliver food directly to NGOs and community centers. Real-time tracking ensures accountability.',
              icon: Truck,
              color: 'bg-blue-50 dark:bg-blue-500/10',
              iconColor: 'text-blue-600',
            },
          ].map((feature, idx) => (
            <div key={idx} className="fb-card p-6 hover:shadow-lg transition-all duration-300 group">
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon size={26} className={feature.iconColor} strokeWidth={2} />
              </div>
              <div className="text-xs font-bold text-[#FF5A2F] mb-2 uppercase tracking-wider">Step {feature.step}</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F7FA] mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 dark:text-[#AAB4C2] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose FoodBridge */}
      <div className="mb-16 animate-fade-in-up">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
            Why Organizations Trust FoodBridge
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              title: 'Time-Critical Logistics',
              description: 'Automated matching and routing ensure food reaches communities before expiry—typically within 2-4 hours.',
              icon: Clock,
            },
            {
              title: 'Verified Network',
              description: 'All NGOs undergo administrative verification. Volunteer drivers complete background checks before joining.',
              icon: ShieldCheck,
            },
            {
              title: 'Local Impact',
              description: 'Smart radius-based matching connects donors with nearby organizations, minimizing transit time and maximizing freshness.',
              icon: MapPin,
            },
            {
              title: 'Zero Cost for Donors',
              description: 'Completely free for food businesses. Focus on reducing waste while volunteers handle pickup and delivery.',
              icon: CheckCircle2,
            },
            {
              title: 'Community Building',
              description: 'Join a growing network of businesses, NGOs, and volunteers working together to end food waste locally.',
              icon: Users,
            },
            {
              title: 'Environmental Impact',
              description: 'Every meal saved reduces landfill waste and greenhouse gas emissions from food decomposition.',
              icon: Leaf,
            },
          ].map((benefit, idx) => (
            <div key={idx} className="fb-card p-5 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/10 transition-colors">
                  <benefit.icon size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-[#FF5A2F] transition-colors" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-[#F5F7FA] mb-1.5">{benefit.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-[#AAB4C2] leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="fb-card p-8 sm:p-10 text-center bg-gradient-to-br from-orange-50 to-white dark:from-orange-500/5 dark:to-slate-900 border-[#FFD0C8] dark:border-orange-500/20 animate-fade-in-up">
        <TrendingUp size={40} className="text-[#FF5A2F] mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F5F7FA] mb-3">
          Ready to Make a Difference?
        </h2>
        <p className="text-slate-600 dark:text-[#AAB4C2] mb-6 max-w-xl mx-auto">
          Whether you're a restaurant with surplus food, an NGO serving communities, or a volunteer driver—join FoodBridge and help feed those in need.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            to="/register"
            variant="primary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
          >
            Create Account
          </Button>
          <Button
            to="/login"
            variant="secondary"
            size="lg"
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
