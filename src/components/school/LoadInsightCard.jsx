import { useState, useMemo } from 'react';
import { Sparkles, Loader2, BrainCircuit, CalendarClock } from 'lucide-react';
import { estimateDayLoad, hasGemini } from '../../lib/gemini';
import { formatMinutes } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * LoadInsightCard — Carico di studio della GIORNATA DI STUDIO selezionata.
 *
 * Nuova logica (separazione scadenza ↔ svolgimento):
 * - il carico somma le attività ASSEGNATE a questo giorno di studio
 *   (`studyDate` = giorno), non le sole scadenze di calendario;
 * - per default una scadenza senza pianificazione esplicita resta nel carico
 *   del suo giorno ("auto"), quindi assegnare un compito in scadenza
 *   domani/dopodomani/+N a oggi lo aggiunge al carico di oggi, e pianificare
 *   una scadenza di oggi in un altro giorno la rimuove da qui;
 * - il selettore "Pianifica attività" apre lo StudyPlanSheet da cui attingere
 *   alle scadenze dei giorni successivi.
 */
export default function LoadInsightCard({ dateKey, studyTasks = [], onOpenPlan }) {
  const [insight, setInsight] = useState(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [loading, setLoading] = useState(false);

  const pending = studyTasks.filter((t) => !t.completed);
  const totalEst = pending.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const doneEst = studyTasks.filter((t) => t.completed).reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const ratio = totalEst + doneEst > 0 ? doneEst / (totalEst + doneEst) : 0;
  const plannedCount = studyTasks.filter((t) => t.studyDate === dateKey).length;

  const cacheKey = useMemo(() => {
    const hash = studyTasks.map((t) => `${t._id}:${t.completed ? 1 : 0}`).join('|');
    return `app1_loadinsight_${dateKey}_${hash.length}`;
  }, [dateKey, studyTasks]);

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
    const result = await estimateDayLoad(studyTasks);
    setInsight(result ?? 'Gemini non è raggiungibile al momento. Riprova tra poco.');
    try {
      if (result) localStorage.setItem(cacheKey, result);
    } catch { /* ignora */ }
    setLoading(false);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <BrainCircuit size={17} className="text-sky shrink-0" />
          <span className="text-[15px] font-semibold text-label truncate">Carico di studio</span>
        </div>
        {loadLevel && <span className={cn('text-[13px] font-semibold shrink-0', levelColor)}>{loadLevel}</span>}
      </div>

      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-[26px] font-semibold text-label tracking-tight leading-none">{formatMinutes(totalEst)}</span>
        <span className="text-[12.5px] text-label-tertiary">
          pianificati su {pending.length} {pending.length === 1 ? 'attività' : 'attività'}
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-fill-tertiary overflow-hidden mb-3">
        <div className="h-full rounded-full bg-sys-green transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>

      {/* Selettore giornata di studio: attinge dalle scadenze dei giorni successivi */}
      <button
        onClick={onOpenPlan}
        className="w-full h-11 rounded-full bg-accent/15 border border-accent/25 text-sky text-[13.5px] font-semibold flex items-center justify-center gap-2 active:bg-accent/25 transition-colors"
        aria-label="Pianifica quali attività studiare in questo giorno"
      >
        <CalendarClock size={15} className="shrink-0" />
        Pianifica attività
        <span className="text-sky/70 font-medium">· {plannedCount} scelte</span>
      </button>
      <p className="text-[11.5px] text-label-tertiary leading-snug mt-2">
        Il carico include le scadenze di oggi più le attività che decidi di
        preparare in questo giorno (anche se scadono domani o dopo).
      </p>

      {hasGemini && (
        insight || cached ? (
          <div className="flex gap-2.5 bg-surface-2 rounded-xl p-3.5 mt-3">
            <Sparkles size={15} className="text-sky shrink-0 mt-0.5" />
            <p className="text-[13.5px] leading-relaxed text-label-secondary">
              {insight || cached}
            </p>
          </div>
        ) : (
          <button
            onClick={analyze}
            disabled={loading || studyTasks.length === 0}
            className="w-full h-10 mt-3 rounded-full bg-white/[0.06] text-sky text-[13.5px] font-semibold flex items-center justify-center gap-2 active:opacity-70 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Analisi in corso…' : 'Analizza carico giornaliero'}
          </button>
        )
      )}
    </div>
  );
}
