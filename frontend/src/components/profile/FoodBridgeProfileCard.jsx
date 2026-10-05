import { useState, useMemo } from 'react';
import { Lanyard } from './Lanyard';
import {
  generateCardFrontTexture,
  generateCardBackTexture,
  generateLanyardStrapTexture,
} from './LanyardCardCanvas';
import { RotateCw, RefreshCcw, Sparkles, ShieldCheck, Download, Copy, Check, Hand } from 'lucide-react';

import { Button } from '../common/Button';

const ROLE_THEMES = {
  DONOR: {
    accentColor: '#FF5A2F',
    roleLabel: 'Food Donor',
    badgeText: 'AUTHORIZED DONOR',
    defaultLocation: 'Hyderabad Hub · South Zone',
    metric1Label: 'DONATIONS',
    metric2Label: 'MEALS SAVED',
    prefix: 'FB-DON',
  },
  NGO: {
    accentColor: '#10B981',
    roleLabel: 'NGO Partner',
    badgeText: 'VERIFIED DISTRIBUTION NGO',
    defaultLocation: 'Relief Center · Secunderabad',
    metric1Label: 'CAPACITY',
    metric2Label: 'MEALS RECEIVED',
    prefix: 'FB-NGO',
  },
  VOLUNTEER: {
    accentColor: '#3B82F6',
    roleLabel: 'Volunteer Driver',
    badgeText: 'FIRST RESPONDER LOGISTICS',
    defaultLocation: 'Transit Fleet · Sector 4',
    metric1Label: 'DELIVERIES',
    metric2Label: 'RESCUES ACTIVE',
    prefix: 'FB-VOL',
  },
  ADMIN: {
    accentColor: '#8B5CF6',
    roleLabel: 'System Administrator',
    badgeText: 'ROOT NETWORK OPERATOR',
    defaultLocation: 'Global Command Center',
    metric1Label: 'NODES',
    metric2Label: 'SYSTEM HEALTH',
    prefix: 'FB-ADM',
  },
};

export function FoodBridgeProfileCard({ user, stats = {} }) {
  const role = user?.role || 'DONOR';
  const theme = ROLE_THEMES[role] || ROLE_THEMES.DONOR;

  const [flipSignal, setFlipSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [copied, setCopied] = useState(false);

  // Generate deterministic ID if user_id is integer or uuid
  const formattedId = useMemo(() => {
    if (!user?.user_id) return `${theme.prefix}-884920`;
    const cleanId = String(user.user_id).replace(/-/g, '').slice(0, 6).toUpperCase();
    return `${theme.prefix}-${cleanId}`;
  }, [user?.user_id, theme.prefix]);

  // Derived user display info
  const cardData = useMemo(() => {
    let name = user?.email?.split('@')[0]?.replace(/[._]/g, ' ') || 'FoodBridge Partner';
    // Capitalize name
    name = name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    let metric1Value = stats.metric1 ?? '24';
    let metric2Value = stats.metric2 ?? '1,200+';

    if (role === 'DONOR') {
      metric1Value = stats.totalDonations !== undefined ? String(stats.totalDonations).padStart(2, '0') : '08';
      metric2Value = stats.totalMeals !== undefined ? `${stats.totalMeals.toLocaleString()}` : '650+';
    } else if (role === 'NGO') {
      metric1Value = stats.capacity !== undefined ? `${stats.capacity} kg` : '350 kg';
      metric2Value = stats.mealsReceived !== undefined ? `${stats.mealsReceived.toLocaleString()}` : '480+';
    } else if (role === 'VOLUNTEER') {
      metric1Value = stats.deliveries !== undefined ? String(stats.deliveries).padStart(2, '0') : '14';
      metric2Value = stats.activeRescues !== undefined ? String(stats.activeRescues).padStart(2, '0') : '02';
    }

    return {
      name,
      role: theme.roleLabel,
      id: formattedId,
      email: user?.email || 'partner@foodbridge.org',
      metric1: { label: theme.metric1Label, value: metric1Value },
      metric2: { label: theme.metric2Label, value: metric2Value },
      status: user?.account_status === 'ACTIVE' ? 'VERIFIED PARTNER' : 'AUTHORIZED MEMBER',
      accentColor: theme.accentColor,
      location: stats.location || theme.defaultLocation,
    };
  }, [user, role, theme, formattedId, stats]);

  // Generate dynamic front, back, and strap textures
  const frontImage = useMemo(() => generateCardFrontTexture(cardData), [cardData]);
  const backImage = useMemo(() => generateCardBackTexture(cardData), [cardData]);
  const strapImage = useMemo(() => generateLanyardStrapTexture(theme.accentColor), [theme.accentColor]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(formattedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = () => {
    const link = document.createElement('a');
    link.download = `${formattedId}-card.png`;
    link.href = frontImage;
    link.click();
  };

  return (
    <div
      className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-[20px] p-6 shadow-sm flex flex-col items-center relative overflow-hidden"
    >
      {/* Decorative top ambient aura */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '200px',
          background: `radial-gradient(circle, ${theme.accentColor}25 0%, rgba(255,255,255,0) 70%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header bar with role chip and interactive helper */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: `${theme.accentColor}15`,
              color: theme.accentColor,
              border: `1px solid ${theme.accentColor}30`,
            }}
          >
            <ShieldCheck size={13} />
            {theme.badgeText}
          </span>
        </div>

        <div
          className="text-slate-500 dark:text-[#AAB4C2] font-medium text-xs flex items-center gap-1.5"
        >
          <Sparkles size={13} style={{ color: theme.accentColor }} />
          <span>Interactive 3D Physics</span>
        </div>
      </div>

      {/* 3D Lanyard Canvas Viewport */}
      <div
        className="w-full h-[460px] relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#0E141B] border border-slate-200 dark:border-[#26313D]"
      >
        {/* Interaction Hint Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Hand size={13} className="shrink-0 text-slate-300" aria-hidden="true" />
          <span>Grab & swing the badge</span>
        </div>


        <Lanyard
          frontImage={frontImage}
          backImage={backImage}
          lanyardImage={strapImage}
          flipSignal={flipSignal}
          resetSignal={resetSignal}
          position={[0, 0, 13.5]}
          gravity={[0, -38, 0]}
          fov={23}
        />
      </div>

      {/* Action Toolbar Below Canvas */}
      <div
        className="w-full flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-[#26313D] flex-wrap gap-2.5"
      >
        {/* ID Number Tag */}
        <div
          onClick={handleCopyId}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-semibold font-mono transition-colors duration-150 select-none bg-slate-100 hover:bg-slate-200/70 border-slate-200 text-slate-800 dark:bg-[#171D25] dark:hover:bg-[#1E2631] dark:border-[#26313D] dark:text-[#F5F7FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A2F]/40"
          title="Click to copy ID"
        >
          <span>{formattedId}</span>
          {copied ? (
            <Check size={13} className="text-emerald-500 shrink-0" />
          ) : (
            <Copy size={13} className="text-slate-400 dark:text-[#7F8A99] shrink-0" />
          )}
        </div>

        {/* Physics Controls Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            id="profile-flip-badge-btn"
            onClick={() => setFlipSignal((s) => s + 1)}
            variant="secondary"
            size="sm"
            icon={RotateCw}
          >
            Spin Badge
          </Button>

          <Button
            id="profile-reset-physics-btn"
            onClick={() => setResetSignal((s) => s + 1)}
            variant="secondary"
            size="sm"
            icon={RefreshCcw}
          >
            Center
          </Button>

          <Button
            id="profile-download-card-btn"
            onClick={handleDownloadCard}
            variant="primary"
            size="sm"
            icon={Download}
            style={{
              background: theme.accentColor,
              borderColor: theme.accentColor,
              boxShadow: `0 2px 8px -2px ${theme.accentColor}60`,
            }}
          >
            Export Pass
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FoodBridgeProfileCard;
