/**
 * SmartMatchPanel — Decision Engine result display.
 * Cloudhub style: Clean white card, coral-orange ranking medals, sleek score bars.
 */

import { useState } from 'react';
import { decisionEngineService } from '../../services/decisionEngineService';
import {
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Award,
  MapPin,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';

const SCORE_DIMENSIONS = [
  {
    key:    'distance_score',
    label:  'Proximity',
    weight: 0.35,
    gradient: 'linear-gradient(90deg, #FF5E3A, #FF4500)',
    hint:   'Closer NGOs score higher. Reduces transport time and food spoilage risk.',
  },
  {
    key:    'capacity_score',
    label:  'Capacity',
    weight: 0.25,
    gradient: 'linear-gradient(90deg, #10B981, #34D399)',
    hint:   'NGOs with more remaining daily meal capacity score higher.',
  },
  {
    key:    'compatibility_score',
    label:  'Food Compatibility',
    weight: 0.15,
    gradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
    hint:   'NGOs whose food type preferences match this donation score higher.',
  },
  {
    key:    'reliability_score_weighted',
    label:  'Reliability',
    weight: 0.15,
    gradient: 'linear-gradient(90deg, #64748B, #94A3B8)',
    hint:   'Based on historical acceptance rate for matched donations.',
  },
  {
    key:    'response_score',
    label:  'Response Speed',
    weight: 0.10,
    gradient: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
    hint:   'NGOs with a faster average response time to requests score higher.',
  },
];

const ScoreBar = ({ label, value, gradient, hint, weight }) => {
  const pct = Math.round(Math.min(100, Math.max(0, (value ?? 0) * 100)));
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-700 font-semibold">{label}</span>
          <span className="text-slate-400 font-medium text-[10px]">({Math.round(weight * 100)}%)</span>
          <button
            type="button"
            onClick={() => setShowHint(v => !v)}
            className="text-slate-400 hover:text-slate-700 transition"
            aria-label={`What is ${label}?`}
          >
            <HelpCircle size={12} />
          </button>
        </div>
        <span className="text-slate-900 font-bold tabular-nums">{pct}%</span>
      </div>
      {showHint && (
        <p className="text-[11px] text-slate-500 pl-0.5 pb-0.5 leading-relaxed bg-slate-50 p-2 rounded-lg">{hint}</p>
      )}
      <div className="h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: gradient }}
        />
      </div>
    </div>
  );
};

const WhyThisMatch = ({ match, rank }) => {
  if (!match) return null;
  const reasons = [];

  const distKm = match.distance_km;
  if (distKm !== undefined && distKm !== null) {
    if (distKm < 3)       reasons.push('Very close — under 3 km from pickup location.');
    else if (distKm < 8)  reasons.push(`Nearby — ${distKm.toFixed(1)} km from pickup.`);
    else                   reasons.push(`Within service radius at ${distKm.toFixed(1)} km.`);
  }

  const capRaw = match.capacity_score ?? 0;
  if (capRaw > 0.7)       reasons.push('High remaining daily meal capacity.');
  else if (capRaw > 0.3)  reasons.push('Sufficient meal capacity available.');

  const compRaw = match.compatibility_score ?? 0;
  if (compRaw > 0.7)      reasons.push('Excellent food type match.');
  else if (compRaw > 0.3) reasons.push('Acceptable food type compatibility.');

  const relRaw = match.reliability_score_weighted ?? 0;
  if (relRaw > 0.12)      reasons.push('Strong historical acceptance track record.');

  const respRaw = match.response_score ?? 0;
  if (respRaw > 0.08)     reasons.push('Historically rapid response time.');

  if (rank === 1)         reasons.unshift('Ranked #1 — highest multi-criteria optimization score.');

  if (reasons.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
        <HelpCircle size={13} className="text-[#FF553E]" />
        <span>Why this match?</span>
      </p>
      <ul className="space-y-1.5">
        {reasons.map((r, i) => (
          <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
            <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const NGOCard = ({ match, rank }) => {
  const [expanded, setExpanded] = useState(rank === 1);
  const isTop     = rank === 1;
  const ngoName   = match.ngo_name || match.organisation_name || `NGO #${match.ngo_id}`;
  const totalScore = match.total_score ?? match.score ?? 0;
  const totalPct   = Math.round(Math.min(100, Math.max(0, totalScore * 100)));

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
        isTop
          ? 'border-orange-300 shadow-md ring-1 ring-orange-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top accent strip for #1 */}
      {isTop && (
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #FF5E3A, #FF4500)' }}
        />
      )}

      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5 min-w-0">
            {/* Rank badge */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                isTop
                  ? 'bg-gradient-to-tr from-[#FF5E3A] to-[#FF4500] text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {isTop ? <Award size={18} /> : `#${rank}`}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{ngoName}</p>
              <div className="flex items-center space-x-2 mt-0.5">
                {match.distance_km !== undefined && match.distance_km !== null && (
                  <span className="text-xs text-slate-500 font-medium flex items-center space-x-0.5">
                    <MapPin size={12} className="shrink-0 text-slate-400" />
                    <span>{match.distance_km.toFixed(1)} km</span>
                  </span>
                )}
                {match.city && (
                  <span className="text-xs text-slate-400">· {match.city}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right">
              <div
                className={`text-lg font-extrabold tabular-nums ${isTop ? 'text-[#FF553E]' : 'text-slate-900'}`}
              >
                {totalPct}%
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</div>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label={expanded ? 'Collapse scoring details' : 'Expand scoring details'}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4 bg-slate-50/60">
          <p className="text-xs font-bold text-slate-500 mb-3">
            Multi-dimensional optimization scoring breakdown:
          </p>
          {SCORE_DIMENSIONS.map(({ key, label, gradient, hint, weight }) => {
            const val = match[key];
            if (val === undefined) return null;
            return (
              <ScoreBar
                key={key}
                label={label}
                value={val}
                gradient={gradient}
                hint={hint}
                weight={weight}
              />
            );
          })}
          <WhyThisMatch match={match} rank={rank} />
        </div>
      )}
    </div>
  );
};

export const SmartMatchPanel = ({ donationId, onComplete }) => {
  const [stage, setStage]     = useState('idle');
  const [results, setResults] = useState([]);
  const [meta, setMeta]       = useState(null);
  const [error, setError]     = useState(null);

  const handleRun = async () => {
    setStage('running');
    setError(null);
    try {
      const res = await decisionEngineService.runEngine(donationId, 5);
      const data    = res?.data || res;
      const matches = data?.recommendations || res?.matches || res?.data?.matches || [];
      setResults(matches);
      setMeta({
        totalCandidates: data?.total_candidates,
        totalEligible:   data?.total_eligible,
        totalScored:     data?.total_scored,
        algorithmVersion: data?.algorithm_version,
      });
      setStage('done');
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || 'Smart Match failed.');
      setStage('error');
    }
  };

  if (stage === 'idle') {
    return (
      <button
        id="run-smart-match-btn"
        onClick={handleRun}
        className="w-full rounded-2xl border border-orange-200 bg-orange-50/60 hover:bg-orange-50 overflow-hidden group transition-all duration-200 shadow-sm"
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center space-x-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-orange-200 text-[#FF553E] shadow-sm"
            >
              <Zap size={20} className="fill-[#FF553E]/20" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Run Smart Match</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Rank best local NGOs using Decision Engine</p>
            </div>
          </div>
          <div
            className="px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-tr from-[#FF5E3A] to-[#FF4500] shadow transition group-hover:scale-105"
          >
            Run Engine →
          </div>
        </div>
      </button>
    );
  }

  if (stage === 'running') {
    return (
      <div className="flex items-center space-x-3 p-5 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF553E] text-sm">
        <Zap size={18} className="shrink-0 animate-journey-pulse" />
        <div>
          <p className="font-bold">Evaluating candidate NGOs…</p>
          <p className="text-xs text-slate-500 mt-0.5">Scoring proximity, capacity, compatibility &amp; reliability</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="space-y-2">
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={handleRun} className="text-xs text-slate-500 hover:text-slate-900 underline font-bold">
          Retry Smart Match
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-slate-200 text-center bg-white shadow-sm">
        <p className="text-sm font-bold text-slate-700">No eligible NGO matches found at this time.</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">Nearby NGOs may not have remaining capacity for today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Award size={18} className="text-[#FF553E] shrink-0" />
          <h3 className="text-sm font-bold text-slate-900">
            {results.length} NGO{results.length > 1 ? 's' : ''} matched
          </h3>
          <span className="text-xs text-slate-400 font-semibold">· Ranked by Match Score</span>
        </div>
        {meta && (
          <div className="text-[10px] text-slate-400 text-right font-semibold shrink-0">
            <div>{meta.totalCandidates} candidates evaluated</div>
            <div>{meta.totalEligible} eligible</div>
          </div>
        )}
      </div>

      {/* NGO cards */}
      {results.map((match, i) => (
        <NGOCard key={match.ngo_id ?? i} match={match} rank={i + 1} />
      ))}

      <p className="text-[11px] text-slate-400 text-center pt-1 font-medium">
        Weighted sum of proximity, capacity, compatibility, reliability &amp; response speed.
        {meta?.algorithmVersion && ` Algorithm v${meta.algorithmVersion}.`}
      </p>
    </div>
  );
};
