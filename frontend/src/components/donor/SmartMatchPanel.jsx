/**
 * SmartMatchPanel — Decision Engine result display.
 * Cloudhub style: Clean light & dark design, coral-orange ranking medals, sleek score bars.
 * Displays transparent 6-dimension scoring, explainable decision reasons, and candidate audits.
 *
 * Pipeline interaction:
 *   Donation → Candidate Discovery → Eligibility → Multi-factor Scoring → Ranking → NGO Recommendation
 * Staggered restrained Motion transitions with prefers-reduced-motion support.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
  Search,
  Filter,
  BarChart3,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Decision Engine Pipeline Stages Configuration
// ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  {
    id: 'discovery',
    stepNumber: '01',
    label: 'Candidate Discovery',
    description: 'Scanning registered NGOs within geographic service radius',
    detail: 'Evaluating active verification status, operational zones & location coordinates',
    icon: Search,
  },
  {
    id: 'eligibility',
    stepNumber: '02',
    label: 'Eligibility Filtering',
    description: 'Applying intake capacity thresholds & operating constraints',
    detail: 'Filtering by daily meal quota, operating hours & dietary compatibility',
    icon: Filter,
  },
  {
    id: 'scoring',
    stepNumber: '03',
    label: 'Multi-Factor Scoring',
    description: 'Computing 6-factor deterministic compatibility vectors',
    detail: 'Evaluating Distance, Capacity, Freshness, Demand, Food Type & Availability',
    icon: BarChart3,
    factors: [
      { name: 'Distance', weight: '25%' },
      { name: 'Capacity', weight: '20%' },
      { name: 'Freshness', weight: '20%' },
      { name: 'Demand', weight: '20%' },
      { name: 'Compatibility', weight: '10%' },
      { name: 'Availability', weight: '5%' },
    ],
  },
  {
    id: 'ranking',
    stepNumber: '04',
    label: 'Deterministic Ranking',
    description: 'Ranking candidates & generating explainable decision rationale',
    detail: 'Sorting by weighted composite score to synthesize optimal dispatch recommendation',
    icon: ListOrdered,
  },
];

// ─────────────────────────────────────────────
// Score Color Helper
// ─────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-[#FF5A2F]';
  return 'text-slate-600 dark:text-[#AAB4C2]';
}

// ─────────────────────────────────────────────
// Component Header Banner
// ─────────────────────────────────────────────
const EngineHeader = ({ subtitle, badgeText, rightContent }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2">
    <div>
      <div className="flex items-center space-x-2">
        <span className="text-[10px] font-black tracking-widest text-[#FF5A2F] dark:text-[#FF7A50] uppercase">
          FOODBRIDGE DECISION ENGINE
        </span>
        {badgeText && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-[#FF5A2F] dark:text-[#FF7A50]">
            {badgeText}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] mt-0.5">
        Intelligent multi-criteria NGO matching
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">
          {subtitle}
        </p>
      )}
    </div>
    {rightContent && <div className="shrink-0">{rightContent}</div>}
  </div>
);

// ─────────────────────────────────────────────
// 6-Dimension ScoreBar with Animated Progress
// ─────────────────────────────────────────────
const ScoreBar = ({ label, score, weight, icon: Icon, reducedMotion }) => {
  const pct = Math.round(Math.min(100, Math.max(0, (score ?? 0) * 100)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1 text-slate-600 dark:text-[#AAB4C2] min-w-0">
          {Icon && <Icon size={12} className="text-slate-400 dark:text-[#7F8A99] shrink-0" />}
          <span className="truncate">{label}</span>
        </div>
        <span className="font-bold text-slate-800 dark:text-[#F5F7FA] tabular-nums shrink-0 ml-1">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#FF5A2F] to-[#FF4500]"
          initial={reducedMotion ? { width: `${pct}%` } : { width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <span className="text-[9px] text-slate-400 dark:text-[#7F8A99] block text-right font-medium">
        {weight} weight
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────
// NGO Card with Restrained Entrance Transition
// ─────────────────────────────────────────────
const NGOCard = ({ match, rank, reducedMotion }) => {
  const isTop      = rank === 1;
  const ngoName    = match.ngo_name || match.organisation_name || `NGO #${match.ngo_id}`;
  const totalScore = match.total_score ?? match.score ?? 0;
  const totalPct   = Math.round(Math.min(100, Math.max(0, totalScore * 100)));
  const reason     = match.decision_reason;

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: reducedMotion ? 0 : 12,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reducedMotion ? 0 : 0.35,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      className={`rounded-2xl border transition-[border-color,box-shadow] duration-200 overflow-hidden bg-white dark:bg-[#11171F] ${
        isTop
          ? 'border-orange-300 dark:border-orange-500/40 shadow-md ring-1 ring-orange-200 dark:ring-orange-500/20'
          : 'border-slate-200 dark:border-[#26313D] hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Top accent strip for #1 top match */}
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
                <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
                  {ngoName}
                </p>
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
                  <span className="text-xs text-slate-400 dark:text-[#7F8A99]">
                    · {match.remaining_capacity} meals cap
                  </span>
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
              <span className="font-bold text-slate-900 dark:text-[#F5F7FA]">
                Decision Engine Explanation:{' '}
              </span>
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
            reducedMotion={reducedMotion}
          />
          <ScoreBar
            label="Capacity"
            score={match.capacity_score}
            weight="20%"
            icon={Boxes}
            reducedMotion={reducedMotion}
          />
          <ScoreBar
            label="Freshness"
            score={match.freshness_score ?? 0.70}
            weight="20%"
            icon={Clock}
            reducedMotion={reducedMotion}
          />
          <ScoreBar
            label="Demand"
            score={match.demand_score ?? match.reliability_score ?? 0.50}
            weight="20%"
            icon={Activity}
            reducedMotion={reducedMotion}
          />
          <ScoreBar
            label="Food Type"
            score={match.compatibility_score ?? 1.0}
            weight="10%"
            icon={Utensils}
            reducedMotion={reducedMotion}
          />
          <ScoreBar
            label="Availability"
            score={match.availability_score ?? match.response_score ?? 0.85}
            weight="5%"
            icon={ShieldCheck}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// Multi-Stage Processing Pipeline Visualizer
// ─────────────────────────────────────────────
const ProcessingPipeline = ({ currentStage, reducedMotion }) => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 8 },
    visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' } },
  };

  return (
    <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-white dark:bg-[#11171F] overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-orange-100 dark:border-orange-500/20 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 dark:from-[#171D25] dark:via-[#11171F] dark:to-[#171D25]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] text-white shadow-sm">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-[#FF5A2F] dark:text-[#FF7A50] uppercase">
                FOODBRIDGE DECISION ENGINE
              </p>
              <h4 className="text-xs font-bold text-slate-900 dark:text-[#F5F7FA]">
                Intelligent multi-criteria NGO matching
              </h4>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-orange-100/70 dark:bg-orange-500/20 text-[#FF5A2F] dark:text-[#FF7A50]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A2F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5A2F]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {currentStage >= PIPELINE_STAGES.length ? 'Finalizing Recommendation…' : 'Evaluating Pipeline'}
            </span>
          </div>
        </div>
      </div>

      {/* Stepped Pipeline Stages */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-5 space-y-3"
      >
        {PIPELINE_STAGES.map((step, idx) => {
          const isDone    = idx < currentStage;
          const isActive  = idx === currentStage;
          const isPending = idx > currentStage;
          const StepIcon  = step.icon;

          return (
            <motion.div
              key={step.id}
              variants={itemVariants}
              className={`rounded-xl p-3.5 border transition-[border-color,background-color,box-shadow] duration-200 ${
                isActive
                  ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50/40 dark:bg-orange-500/10 shadow-sm ring-1 ring-orange-200 dark:ring-orange-500/20'
                  : isDone
                  ? 'border-slate-200 dark:border-[#242D38] bg-slate-50/50 dark:bg-[#151C24]'
                  : 'border-slate-100 dark:border-[#1E2733] bg-transparent opacity-60'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Step indicator badge */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs transition-colors duration-200 ${
                    isDone
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isActive
                      ? 'bg-[#FF5A2F] text-white'
                      : 'bg-slate-100 dark:bg-[#1C2530] text-slate-400 dark:text-[#7F8A99]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <StepIcon size={14} className={isActive ? 'text-white' : 'text-slate-400 dark:text-[#7F8A99]'} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#7F8A99]">
                        STAGE {step.stepNumber}
                      </span>
                      <p
                        className={`text-xs font-bold ${
                          isActive
                            ? 'text-slate-900 dark:text-[#F5F7FA]'
                            : isDone
                            ? 'text-slate-700 dark:text-[#D2DAE5]'
                            : 'text-slate-400 dark:text-[#7F8A99]'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isDone && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} />
                          <span>Complete</span>
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#FF5A2F] dark:text-[#FF7A50] animate-pulse">
                          <span>Processing…</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-[#7F8A99]">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-[#AAB4C2] mt-0.5">
                    {step.description}
                  </p>

                  {/* Active progress bar indicator */}
                  {isActive && !reducedMotion && (
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-[#1C2530] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#FF5A2F] to-[#FF4500] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: (idx === 2 ? 0.9 : 0.7), ease: [0.2, 0, 0.2, 1] }}
                      />
                    </div>
                  )}

                  {/* Scoring weights breakdown chips on Stage 3 */}
                  {step.factors && (isActive || isDone) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#242D38]/60 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                      {step.factors.map(f => (
                        <div
                          key={f.name}
                          className="px-2 py-1 rounded-md bg-white dark:bg-[#1A232E] border border-slate-200/80 dark:border-[#26313D] text-[10px] text-center"
                        >
                          <span className="font-semibold text-slate-700 dark:text-[#D2DAE5] block truncate">
                            {f.name}
                          </span>
                          <span className="font-extrabold text-[#FF5A2F] tabular-nums">
                            {f.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer bar */}
      <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-[#0E141B] border-t border-slate-100 dark:border-[#242D38] flex items-center justify-between text-[10px] text-slate-400 dark:text-[#7F8A99] font-medium">
        <span>Deterministic Multi-Factor Scoring Architecture</span>
        <span>Candidate Discovery → Eligibility → Scoring → Ranking</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main SmartMatchPanel Export
// ─────────────────────────────────────────────
export const SmartMatchPanel = ({ donationId, onComplete }) => {
  const reducedMotion = useReducedMotion();

  const [stage, setStage]                     = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [pipelineIndex, setPipelineIndex]     = useState(0);       // 0 to 3
  const [results, setResults]                 = useState([]);
  const [candidates, setCandidates]           = useState([]);
  const [showCandidates, setShowCandidates]   = useState(false);
  const [meta, setMeta]                       = useState(null);
  const [error, setError]                     = useState(null);

  const stageTimerRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    if (!donationId) return;
    setStage('running');
    setPipelineIndex(0);
    setError(null);

    // Staggered pipeline timeline:
    // Stage 0: Candidate Discovery ~700ms
    // Stage 1: Eligibility Filter ~700ms
    // Stage 2: Multi-Factor Scoring ~900ms
    // Stage 3: Deterministic Ranking ~700ms
    // Followed by brief ~300ms settlement when all stages are complete.
    // Total visual processing: ~3.3 seconds (or ~200ms when reducedMotion is enabled)
    const stageDurations = reducedMotion ? [50, 50, 50, 50] : [700, 700, 900, 700];

    const pipelinePromise = new Promise(resolve => {
      let currentStep = 0;
      setPipelineIndex(0);

      const advance = () => {
        if (currentStep < PIPELINE_STAGES.length - 1) {
          stageTimerRef.current = setTimeout(() => {
            currentStep += 1;
            setPipelineIndex(currentStep);
            advance();
          }, stageDurations[currentStep]);
        } else {
          // Final stage completes after its duration plus a brief settlement pause
          stageTimerRef.current = setTimeout(() => {
            setPipelineIndex(PIPELINE_STAGES.length);
            stageTimerRef.current = setTimeout(() => {
              resolve();
            }, reducedMotion ? 0 : 300);
          }, stageDurations[currentStep]);
        }
      };

      advance();
    });

    try {
      // Trigger Decision Engine API
      const enginePromise = decisionEngineService.runEngine(donationId, 5);

      // Wait for both the backend computation and the pipeline animation
      const [res] = await Promise.all([enginePromise, pipelinePromise]);

      const data = res?.data || res;
      setResults(data.recommendations || []);
      setCandidates(data.candidates || []);
      setMeta({
        totalCandidates:  data.total_candidates,
        totalEligible:    data.total_eligible,
        totalScored:      data.total_scored,
        selectedNgoName:  data.selected_ngo_name,
        score:            data.score,
        decisionReason:   data.decision_reason,
        algorithmVersion: data.algorithm_version,
      });

      // Transition smoothly into results
      setStage('done');
      if (onComplete && typeof onComplete === 'function') {
        onComplete(data);
      }
    } catch (err) {
      setError(err?.message || 'Decision engine execution failed.');
      setStage('error');
    }
  };

  // ── IDLE STATE ────────────────────────────
  if (stage === 'idle') {
    return (
      <div className="space-y-3">
        <EngineHeader
          subtitle="Deterministic 6-factor evaluation & dispatch with explainable AI reasoning"
          badgeText="v1.0"
        />

        <button
          onClick={handleRun}
          className="w-full text-left rounded-2xl border border-dashed border-orange-300 dark:border-orange-500/40 bg-orange-50/40 dark:bg-orange-500/10 hover:bg-orange-50 dark:hover:bg-orange-500/15 hover:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A2F]/30 transition-colors duration-200 group cursor-pointer p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-[#171D25] border border-orange-200 dark:border-orange-500/30 text-[#FF5A2F] shadow-sm group-hover:scale-105 transition-transform duration-200 will-change-transform transform-gpu">
                <Zap size={20} className="fill-[#FF5A2F]/20" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
                  Run Smart Match Pipeline
                </p>
                <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium truncate">
                  Candidate Discovery → Eligibility → Multi-factor Scoring → Ranking
                </p>
              </div>
            </div>

            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-tr from-[#FF5A2F] to-[#FF4500] shadow transition-all duration-200 group-hover:scale-105 group-hover:shadow-md shrink-0 whitespace-nowrap self-start sm:self-auto will-change-transform transform-gpu">
              Run Engine →
            </div>
          </div>
        </button>
      </div>
    );
  }

  // ── RUNNING STATE ─────────────────────────
  if (stage === 'running') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="running-pipeline"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
        >
          <ProcessingPipeline
            currentStage={pipelineIndex}
            reducedMotion={reducedMotion}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── ERROR STATE ───────────────────────────
  if (stage === 'error') {
    return (
      <div className="space-y-3">
        <EngineHeader
          subtitle="An issue occurred while evaluating matches"
          badgeText="Error"
        />

        <div className="fb-alert-error">
          <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-xs leading-relaxed">{error}</span>
        </div>

        <button
          onClick={handleRun}
          className="inline-flex items-center space-x-1.5 text-xs text-[#FF5A2F] hover:text-[#FF4500] font-bold cursor-pointer transition-colors"
        >
          <RotateCcw size={13} />
          <span>Retry Smart Match</span>
        </button>
      </div>
    );
  }

  // ── EMPTY RESULTS STATE ───────────────────
  if (results.length === 0) {
    return (
      <div className="space-y-3">
        <EngineHeader
          subtitle="No eligible matches found within operational parameters"
          badgeText="Completed"
          rightContent={
            <button
              onClick={handleRun}
              className="inline-flex items-center space-x-1 text-xs text-[#FF5A2F] hover:text-[#FF4500] font-bold cursor-pointer transition-colors"
            >
              <RotateCcw size={12} />
              <span>Re-evaluate</span>
            </button>
          }
        />

        <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#26313D] text-center bg-white dark:bg-[#11171F] shadow-sm space-y-1.5">
          <p className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">
            No eligible NGO matches found at this time.
          </p>
          <p className="text-xs text-slate-400 dark:text-[#748296] font-medium max-w-md mx-auto">
            Nearby NGOs may not have remaining intake capacity for today, or are outside the maximum operational radius.
          </p>
        </div>
      </div>
    );
  }

  // ── RESULTS STATE ─────────────────────────
  const listContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.09,
        delayChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="match-results"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-4"
      >
        {/* Header */}
        <EngineHeader
          subtitle={`${results.length} NGO${results.length > 1 ? 's' : ''} Recommended · Ranked Deterministically`}
          badgeText={`Engine v${meta?.algorithmVersion || '1.0'}`}
          rightContent={
            <div className="flex items-center space-x-3">
              {meta && (
                <div className="text-[10px] text-slate-400 dark:text-[#7F8A99] text-right font-semibold hidden sm:block">
                  <div>{meta.totalCandidates} candidates evaluated</div>
                  <div>{meta.totalEligible} eligible · {meta.totalScored} scored</div>
                </div>
              )}
              <button
                onClick={handleRun}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-[#D2DAE5] bg-slate-100 hover:bg-slate-200 dark:bg-[#1A232E] dark:hover:bg-[#242F3D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A2F]/30 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw size={12} />
                <span>Re-run Engine</span>
              </button>
            </div>
          }
        />

        {/* NGO Cards List with Staggered Entrance */}
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {results.map((match, i) => (
            <NGOCard
              key={match.ngo_id ?? i}
              match={match}
              rank={i + 1}
              reducedMotion={reducedMotion}
            />
          ))}
        </motion.div>

        {/* Candidates Audit Accordion */}
        {candidates.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-[#26313D] bg-slate-50/50 dark:bg-[#151C24] overflow-hidden">
            <button
              onClick={() => setShowCandidates(!showCandidates)}
              aria-expanded={showCandidates}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 dark:text-[#D2DAE5] hover:bg-slate-100/60 dark:hover:bg-[#1A232E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A2F]/30 transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Info size={14} className="text-slate-400 dark:text-[#7F8A99]" />
                <span>Evaluated Candidates Breakdown ({candidates.length})</span>
              </div>
              {showCandidates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {showCandidates && (
                <motion.div
                  key="candidates-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
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
                          {cand.distance_km !== null && cand.distance_km !== undefined && (
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
                            <span className="text-[10px] text-slate-500 dark:text-[#AAB4C2] italic">
                              {cand.rejection_reason || 'Disqualified'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Transparent scoring footer info */}
        <p className="text-[11px] text-slate-500 dark:text-[#AAB4C2] text-center pt-1 font-medium">
          Decision Engine v{meta?.algorithmVersion || '1.0'} · Multi-criteria transparent scoring (Distance 25%, Capacity 20%, Freshness 20%, Demand 20%, Compatibility 10%, Availability 5%).
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default SmartMatchPanel;
