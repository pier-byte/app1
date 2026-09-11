import { useState, useMemo } from 'react';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';
import { estimateDayLoad, hasGemini } from '../../lib/gemini';
import { formatMinutes } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * LoadInsightCard — Carico di studio del giorno con analisi via Gemini AI.
 */
export default function LoadInsightCard({ dateKey, tasks }) {
  const [insight, setInsight] = useState(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [loading, setLoading] = useState(false);

  const pending = tasks.filter((t) => !t.completed);
  const totalEst = pending.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const doneEst = tasks.filter((t) => t.completed).reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const ratio = totalEst + doneEst > 0 ? doneEst / (totalEst + doneEst) : 0;

  const cacheKey = useMemo(() => {
    const hash = tasks.map((t) => `${t._id}:${t.completed ? 1 : 0}`).join('|');
    return `app1_loadinsight_${dateKey}_${hash.length}`;
  }, [dateKey, tasks]);

  // Cache in memoria della sessione, invalidata da cacheBust
  const cached = useMemo(() => {
    if (cacheBust < 0) return null; // noop per dipendenza
    try {
      return localStorage.getItem(cacheKey);
    } catch {
      return null;
    }
  }, [cacheKey, cacheBust]);

  const loadLevel = totalEst === 0 ? null : totalEst <= 60 ? 'Leggero' : totalEst <= 150 ? 'Medio' : 'Alto';
  const levelColor = totalEst <= 60 ? 'text-sys-green' : totalEst <= 150 ? 'text-sys-yellow' : 'text-sys-red';

  const analyze = async () => {
    setLoading(true);
    const result = await estimateDayLoad(tasks);
    setInsight(result ?? 'Gemini non è raggiungibile al momento. Riprova tra poco.');
    try {
      if (result) localStorage.setItem(cacheKey, result);
    } catch { /* ignora */ }
    setLoading(false);
  };

  if (tasks.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-sky" />
          <span className="text-[15px] font-semibold text-label">Carico di studio</span>
        </div>
        {loadLevel && <span className={cn('text-[13px] font-semibold', levelColor)}>{loadLevel}</span>}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-[28px] font-semibold text-label tracking-tight">{formatMinutes(totalEst)}</span>
        <span className="text-[13px] text-label-tertiary">stimati su {pending.length} compiti</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-fill-tertiary overflow-hidden mb-4">
        <div className="h-full rounded-full bg-sys-green transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>

      {hasGemini ? (
        insight || cached ? (
          <div className="flex gap-2.5 bg-surface-2 rounded-xl p-3.5">
            <Sparkles size={15} className="text-sky shrink-0 mt-0.5" />
            <p className="text-[13.5px] leading-relaxed text-label-secondary">
              {insight || cached}
            </p>
          </div>
        ) : (
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full h-10 rounded-full bg-accent/15 text-sky text-[14px] font-semibold flex items-center justify-center gap-2 active:opacity-70 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Gemini sta analizzando…' : 'Analizza con Gemini AI'}
          </button>
        )
      ) : (
        <p className="text-[12px] text-label-tertiary leading-relaxed">
          Configura <span className="text-label-secondary">VITE_GEMINI_API_KEY</span> per l'analisi AI del carico.
        </p>
      )}
    </div>
  );
}
