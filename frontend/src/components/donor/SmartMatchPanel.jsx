/**
 * SmartMatchPanel — Decision Engine result display.
 * Cloudhub style: Clean light & dark design, coral-orange ranking medals, sleek score bars.
 * Displays transparent 6-dimension scoring, explainable decision reasons, and candidate audits.
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
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Utensils,
  Activity,
  XCircle,
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
          <span className="truncate">{label}</span>
        </div>
        <span className="font-bold text-slate-800 dark:text-[#F5F7FA] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FF5A2F] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-slate-400 dark:text-[#7F8A99] block text-right font-medium">{weight} weight</span>
    </div>
  );
};

const NGOCard = ({ match, rank }) => {
  const isTop      = rank === 1;
  const ngoName    = match.ngo_name || match.organisation_name || `NGO #${match.ngo_id}`;
  const totalScore = match.total_score ?? match.score ?? 0;
  const totalPct   = Math.round(Math.min(100, Math.max(0, totalScore * 100)));
  const reason     = match.decision_reason;

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
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #FF5A2F, #FF4500)' }}
        />
      )}

      <div className="px-5 py-4 space-y-3.5">
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
              <div className="flex items-center space-x-2">
                <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">{ngoName}</p>
                {isTop && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-[#FF5A2F] shrink-0">
                    Recommended Pick
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                {match.distance_km !== undefined && match.distance_km !== null && (
                  <span className="text-xs text-slate-500 dark:text-[#AAB4C2] font-medium flex items-center space-x-0.5">
                    <MapPin size={12} className="shrink-0 text-slate-400 dark:text-[#7F8A99]" />
                    <span>{match.distance_km.toFixed(1)} km</span>
                  </span>
                )}
                {match.remaining_capacity && (
                  <span className="text-xs text-slate-400 dark:text-[#7F8A99]">· {match.remaining_capacity} meals cap</span>
                )}
              </div>
            </div>
          </div>

          {/* Overall match score pill */}
          <div className="text-right shrink-0">
            <div className="flex items-center space-x-1.5 justify-end">
              <span className={`text-xl font-extrabold tabular-nums ${scoreColor(totalPct)}`}>
                {totalPct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-[#7F8A99] font-medium">Match Score</p>
          </div>
        </div>

        {/* Explainable Decision Reason Callout */}
        {reason && (
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 text-slate-700 dark:text-[#D2DAE5] text-xs leading-relaxed">
            <Info size={14} className="text-[#FF5A2F] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-[#F5F7FA]">Decision Engine Explanation: </span>
              <span>{reason}</span>
            </div>
          </div>
        )}

        {/* 6-Dimension Score Breakdown */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#242D38] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <ScoreBar
            label="Proximity"
            score={match.distance_score}
            weight="25%"
            icon={MapPin}
          />
          <ScoreBar
            label="Capacity"
            score={match.capacity_score}
            weight="20%"
            icon={Boxes}
          />
          <ScoreBar
            label="Freshness"
            score={match.freshness_score ?? 0.70}
            weight="20%"
            icon={Clock}
          />
          <ScoreBar
            label="Demand"
            score={match.demand_score ?? match.reliability_score ?? 0.50}
            weight="20%"
            icon={Activity}
          />
          <ScoreBar
            label="Food Type"
            score={match.compatibility_score ?? 1.0}
            weight="10%"
            icon={Utensils}
          />
          <ScoreBar
            label="Availability"
            score={match.availability_score ?? match.response_score ?? 0.85}
            weight="5%"
            icon={ShieldCheck}
          />
        </div>
      </div>
    </div>
  );
};

export const SmartMatchPanel = ({ donationId }) => {
  const [stage, setStage]               = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [results, setResults]           = useState([]);
  const [candidates, setCandidates]     = useState([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [meta, setMeta]                 = useState(null);
  const [error, setError]               = useState(null);

  const handleRun = async () => {
    if (!donationId) return;
    setStage('running');
    setError(null);
    try {
      const res = await decisionEngineService.runEngine(donationId, 5);
      const data = res?.data || res;
      setResults(data.recommendations || []);
      setCandidates(data.candidates || []);
      setMeta({
        totalCandidates: data.total_candidates,
        totalEligible:   data.total_eligible,
        totalScored:     data.total_scored,
        selectedNgoName: data.selected_ngo_name,
        score:           data.score,
        decisionReason:  data.decision_reason,
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
              <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">Evaluate &amp; dispatch to optimal NGO with explainable AI reasoning</p>
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
        <Zap size={18} className="shrink-0 animate-pulse" />
        <div>
          <p className="font-bold">Evaluating candidate NGOs…</p>
          <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5">Scoring distance (25%), capacity (20%), freshness (20%), demand (20%), food category (10%), &amp; response speed (5%)</p>
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
        <p className="text-xs text-slate-400 dark:text-[#748296] mt-1 font-medium">Nearby NGOs may not have remaining intake capacity for today or are outside service radius.</p>
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
            {results.length} NGO{results.length > 1 ? 's' : ''} Recommended
          </h3>
          <span className="text-xs text-slate-400 dark:text-[#7F8A99] font-semibold">· Ranked Deterministically</span>
        </div>
        {meta && (
          <div className="text-[10px] text-slate-400 dark:text-[#7F8A99] text-right font-semibold shrink-0">
            <div>{meta.totalCandidates} candidates evaluated</div>
            <div>{meta.totalEligible} eligible</div>
          </div>
        )}
      </div>

      {/* Top NGO Card */}
      {results.map((match, i) => (
        <NGOCard key={match.ngo_id ?? i} match={match} rank={i + 1} />
      ))}

      {/* Candidates Audit Accordion */}
      {candidates.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#26313D] bg-slate-50/50 dark:bg-[#151C24] overflow-hidden">
          <button
            onClick={() => setShowCandidates(!showCandidates)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 dark:text-[#D2DAE5] hover:bg-slate-100/60 dark:hover:bg-[#1A232E] transition cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Info size={14} className="text-slate-400" />
              <span>Evaluated Candidates Breakdown ({candidates.length})</span>
            </div>
            {showCandidates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showCandidates && (
            <div className="px-4 pb-3 space-y-2 border-t border-slate-200 dark:border-[#26313D] pt-3">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.ngo_id ?? idx}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/50 dark:border-[#26313D]/50 last:border-0"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {cand.eligible ? (
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={13} className="text-slate-400 dark:text-[#7F8A99] shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800 dark:text-[#F5F7FA] truncate">
                      {cand.ngo_name || `NGO #${cand.ngo_id}`}
                    </span>
                    {cand.distance_km && (
                      <span className="text-[11px] text-slate-400 dark:text-[#7F8A99] shrink-0">
                        ({cand.distance_km} km)
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {cand.eligible ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Math.round((cand.total_score || 0) * 100)}% Match
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-[#7F8A99] italic">
                        {cand.rejection_reason || 'Disqualified'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-[#7F8A99] text-center pt-1 font-medium">
        Decision Engine v{meta?.algorithmVersion || '1.0'} · Multi-criteria transparent scoring (Distance 25%, Capacity 20%, Freshness 20%, Demand 20%, Food 10%, Availability 5%).
      </p>
    </div>
  );
};

export default SmartMatchPanel;

