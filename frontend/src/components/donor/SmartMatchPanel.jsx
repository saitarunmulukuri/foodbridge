/**
 * SmartMatchPanel — Decision Engine result display.
 * Cloudhub style: Clean light & dark design, coral-orange ranking medals, sleek score bars.
 */

import { useState } from 'react';
import { decisionEngineService } from '../../services/decisionEngineService';
import {
  AlertCircle,
  Zap,
  Award,
  MapPin,
  Boxes,
  Clock,
  CheckCircle2,
} from 'lucide-react';

function scoreColor(pct) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-[#FF5A2F]';
  return 'text-slate-600 dark:text-[#AAB4C2]';
}

const ScoreBar = ({ label, score, weight, icon: Icon }) => {
  const pct = Math.round(Math.min(100, Math.max(0, (score ?? 0) * 100)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1 text-slate-600 dark:text-[#AAB4C2]">
          {Icon && <Icon size={12} className="text-slate-400 dark:text-[#7F8A99] shrink-0" />}
          <span>{label}</span>
        </div>
        <span className="font-bold text-slate-800 dark:text-[#F5F7FA] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FF5A2F] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-slate-400 dark:text-[#7F8A99] block text-right">{weight} weight</span>
    </div>
  );
};

const NGOCard = ({ match, rank }) => {
  const isTop     = rank === 1;
  const ngoName   = match.ngo_name || match.organisation_name || `NGO #${match.ngo_id}`;
  const totalScore = match.total_score ?? match.score ?? 0;
  const totalPct   = Math.round(Math.min(100, Math.max(0, totalScore * 100)));

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-[#11171F] ${
        isTop
          ? 'border-orange-300 dark:border-orange-500/40 shadow-md ring-1 ring-orange-200 dark:ring-orange-500/20'
          : 'border-slate-200 dark:border-[#26313D] hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Top accent strip for #1 */}
      {isTop && (
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #FF5A2F, #FF4500)' }}
        />
      )}

      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5 min-w-0">
            {/* Rank badge */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                isTop
                  ? 'bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] text-white'
                  : 'bg-slate-100 dark:bg-[#171D25] text-slate-700 dark:text-[#F5F7FA] border border-slate-200 dark:border-[#242D38]'
              }`}
            >
              {isTop ? <Award size={18} /> : `#${rank}`}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">{ngoName}</p>
              <div className="flex items-center space-x-2 mt-0.5">
                {match.distance_km !== undefined && match.distance_km !== null && (
                  <span className="text-xs text-slate-500 dark:text-[#AAB4C2] font-medium flex items-center space-x-0.5">
                    <MapPin size={12} className="shrink-0 text-slate-400 dark:text-[#7F8A99]" />
                    <span>{match.distance_km.toFixed(1)} km</span>
                  </span>
                )}
                {match.daily_capacity_kg && (
                  <span className="text-xs text-slate-400 dark:text-[#7F8A99]">· {match.daily_capacity_kg} kg cap</span>
                )}
              </div>
            </div>
          </div>

          {/* Overall match score pill */}
          <div className="text-right shrink-0">
            <div className="flex items-center space-x-1.5 justify-end">
              <span className={`text-base font-extrabold ${scoreColor(totalPct)}`}>
                {totalPct}%
              </span>
              {isTop && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-[#FF5A2F]">
                  Top Match
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-[#7F8A99] font-medium">overall match score</p>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#242D38] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreBar
            label="Proximity"
            score={match.proximity_score}
            weight="35%"
            icon={MapPin}
          />
          <ScoreBar
            label="Capacity"
            score={match.capacity_score}
            weight="25%"
            icon={Boxes}
          />
          <ScoreBar
            label="Urgency Fit"
            score={match.urgency_score}
            weight="25%"
            icon={Clock}
          />
          <ScoreBar
            label="Reliability"
            score={match.reliability_score}
            weight="15%"
            icon={CheckCircle2}
          />
        </div>
      </div>
    </div>
  );
};

export const SmartMatchPanel = ({ donationId }) => {
  const [stage, setStage]     = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [results, setResults] = useState([]);
  const [meta, setMeta]       = useState(null);
  const [error, setError]     = useState(null);

  const handleRun = async () => {
    if (!donationId) return;
    setStage('running');
    setError(null);
    try {
      const res = await decisionEngineService.runEngine(donationId, 5);
      const data = res?.data || res;
      setResults(data.recommendations || []);
      setMeta({
        totalCandidates: data.total_candidates_evaluated,
        totalEligible:   data.total_eligible,
        algorithmVersion: data.algorithm_version,
      });
      setStage('done');
    } catch (err) {
      setError(err.message || 'Decision engine execution failed.');
      setStage('error');
    }
  };

  if (stage === 'idle') {
    return (
      <button
        onClick={handleRun}
        className="w-full text-left rounded-2xl border border-dashed border-orange-300 dark:border-orange-500/40 bg-orange-50/40 dark:bg-orange-500/10 hover:bg-orange-50 dark:hover:bg-orange-500/15 hover:border-orange-400 transition-all duration-200 group cursor-pointer"
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center space-x-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-[#171D25] border border-orange-200 dark:border-orange-500/30 text-[#FF5A2F] shadow-sm"
            >
              <Zap size={20} className="fill-[#FF5A2F]/20" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">Run Smart Match</p>
              <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">Rank best local NGOs using Decision Engine</p>
            </div>
          </div>
          <div
            className="px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] shadow transition group-hover:scale-105"
          >
            Run Engine →
          </div>
        </div>
      </button>
    );
  }

  if (stage === 'running') {
    return (
      <div className="flex items-center space-x-3 p-5 rounded-2xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-[#FF5A2F] text-sm">
        <Zap size={18} className="shrink-0 animate-journey-pulse" />
        <div>
          <p className="font-bold">Evaluating candidate NGOs…</p>
          <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5">Scoring proximity, capacity, compatibility &amp; reliability</p>
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
        <button onClick={handleRun} className="text-xs text-slate-500 dark:text-[#AAB4C2] hover:text-slate-900 dark:hover:text-[#F5F7FA] underline font-bold cursor-pointer">
          Retry Smart Match
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#26313D] text-center bg-white dark:bg-[#11171F] shadow-sm">
        <p className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No eligible NGO matches found at this time.</p>
        <p className="text-xs text-slate-400 dark:text-[#748296] mt-1 font-medium">Nearby NGOs may not have remaining capacity for today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Award size={18} className="text-[#FF5A2F] shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">
            {results.length} NGO{results.length > 1 ? 's' : ''} matched
          </h3>
          <span className="text-xs text-slate-400 dark:text-[#7F8A99] font-semibold">· Ranked by Match Score</span>
        </div>
        {meta && (
          <div className="text-[10px] text-slate-400 dark:text-[#7F8A99] text-right font-semibold shrink-0">
            <div>{meta.totalCandidates} candidates evaluated</div>
            <div>{meta.totalEligible} eligible</div>
          </div>
        )}
      </div>

      {/* NGO cards */}
      {results.map((match, i) => (
        <NGOCard key={match.ngo_id ?? i} match={match} rank={i + 1} />
      ))}

      <p className="text-[11px] text-slate-400 dark:text-[#7F8A99] text-center pt-1 font-medium">
        Weighted sum of proximity, capacity, compatibility, reliability &amp; response speed.
        {meta?.algorithmVersion && ` Algorithm v${meta.algorithmVersion}.`}
      </p>
    </div>
  );
};

export default SmartMatchPanel;
