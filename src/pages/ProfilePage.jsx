import { useState, useMemo, lazy, Suspense } from 'react';
import {
  format, startOfMonth, endOfMonth, differenceInCalendarDays,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { PieChart, Pie, Cell } from 'recharts';
import {
  StickyNote, Wallet, ChevronRight, BookOpen, Dumbbell,
  Receipt, Salad, TrendingUp, Target, CalendarDays, CheckCircle2,
} from 'lucide-react';
import SegmentedControl from '../components/ui/SegmentedControl';
import LiquidDialog from '../components/ui/LiquidDialog';
import {
  useTasksBetween, useRoutinesBetween, useMealsBetween,
  useExpenses, useBudget, useNotes,
} from '../hooks/useData';
import { toDateKey, getWeekDates } from '../lib/dates';
import { budgetColor } from '../lib/constants';
import {
  studyByCategory, workoutStats, walletSummary,
  nutritionAdherence, formatDuration, minutesToHoursLabel,
} from '../lib/stats';
import { cn } from '../lib/cn';

// Note e Wallet sono viste interne della sezione Profilo (code-splitting).
const NotesPage = lazy(() => import('./NotesPage'));
const WalletPage = lazy(() => import('./WalletPage'));

const GOALS_KEY = 'app1_nutrition_goals_v2';

function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY)) || null;
  } catch {
    return null;
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * ProfilePage — sezione "Profilo":
 * - Accesso rapido a Note e Wallet (con re-routing diretto);
 * - Dashboard analytics: ore studio per categoria (include Allenamenti),
 *   allenamenti completati con mini-calendario interattivo,
 *   bilancio wallet (cliccabile per aprire Wallet),
 *   aderenza nutrizionale pulita (solo giorni a target).
 */
export default function ProfilePage({ selectedDate }) {
  const [view, setView] = useState('dashboard'); // dashboard | note | wallet

  if (view === 'note') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <NotesPage onBack={() => setView('dashboard')} />
      </Suspense>
    );
  }
  if (view === 'wallet') {
    return (
      <Suspense fallback={<ViewLoader />}>
        <WalletPage selectedDate={selectedDate} weekDates={getWeekDates(selectedDate)} onBack={() => setView('dashboard')} />
      </Suspense>
    );
  }
  return <Dashboard selectedDate={selectedDate} onOpenView={setView} />;
}

function ViewLoader() {
  return <div className="flex items-center justify-center h-full bg-canvas"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
}

// ═══════════════════════ DASHBOARD ═══════════════════════

function Dashboard({ selectedDate, onOpenView }) {
  const [period, setPeriod] = useState('week'); // week | month
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);

  // Intervallo del periodo selezionato (segue la data selezionata nell'app)
  const range = useMemo(() => {
    if (period === 'week') {
      const days = getWeekDates(selectedDate);
      return { start: days[0], end: days[6], count: 7, label: `${format(days[0], 'd MMM', { locale: it })} – ${format(days[6], 'd MMM', { locale: it })}` };
    }
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return { start, end, count: differenceInCalendarDays(end, start) + 1, label: cap(format(start, 'MMMM yyyy', { locale: it })) };
  }, [period, selectedDate]);

  const startKey = toDateKey(range.start);
  const endKey = toDateKey(range.end);

  // Query per il mese completo per il calendario allenamenti
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthStartKey = toDateKey(monthStart);
  const monthEndKey = toDateKey(monthEnd);

  const { data: tasks } = useTasksBetween(startKey, endKey);
  const { data: routines } = useRoutinesBetween(startKey, endKey);
  const { data: monthRoutines } = useRoutinesBetween(monthStartKey, monthEndKey);
  const { data: meals } = useMealsBetween(startKey, endKey);
  const { data: expenses } = useExpenses(startKey, endKey);
  const weekStartKey = toDateKey(getWeekDates(selectedDate)[0]);
  const { data: budget } = useBudget(weekStartKey);
  const { data: notes } = useNotes();

  const study = useMemo(() => studyByCategory(tasks ?? []), [tasks]);
  const workouts = useMemo(() => workoutStats(routines ?? [], range.count), [routines, range.count]);
  const wallet = useMemo(() => walletSummary(expenses ?? [], budget?.budgetAmount ?? 0), [expenses, budget]);
  const targetKcal = useMemo(() => loadGoals()?.calories ?? 0, []);
  const adherence = useMemo(() => nutritionAdherence(meals ?? [], targetKcal), [meals, targetKcal]);

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Profilo</h1>
        <p className="text-[13px] text-label-secondary capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
      </div>

      {/* ── A. Accesso rapido: Note / Wallet ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <QuickCard
          onClick={() => onOpenView('note')}
          icon={<StickyNote size={20} />}
          iconBg="rgba(191, 90, 242, 0.16)"
          iconColor="#bf5af2"
          title="Note"
          subtitle={`${(notes ?? []).length} note salvate`}
        />
        <QuickCard
          onClick={() => onOpenView('wallet')}
          icon={<Wallet size={20} />}
          iconBg="rgba(48, 209, 88, 0.16)"
          iconColor="#30d158"
          title="Wallet"
          subtitle={wallet.budgetAmount > 0 ? `Budget sett. € ${wallet.budgetAmount.toFixed(2).replace('.', ',')}` : 'Spese e budget'}
        />
      </div>

      {/* ── B. Dashboard analytics ── */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Analisi</p>
          <p className="text-[12px] text-label-tertiary truncate">{range.label}</p>
        </div>
        <div className="w-[196px] shrink-0">
          <SegmentedControl
            segments={[
              { id: 'week', label: 'Settimanale' },
              { id: 'month', label: 'Mensile' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* 1. Ore di studio e tipologia attività (include Allenamenti) */}
        <section className="card p-4" aria-label="Ore di studio">
          <SectionLabel icon={<BookOpen size={13} />} text="Studio e attività" />
          {study.totalMinutes > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[30px] font-semibold text-label tracking-tight leading-none">
                  {minutesToHoursLabel(study.totalMinutes)}<span className="text-[16px] text-label-secondary font-medium"> h</span>
                </span>
                <span className="text-[12px] text-label-secondary"> accumulate nel periodo</span>
              </div>
              <div className="flex items-center gap-4">
                <StudyDonut study={study} />
                <ul className="flex-1 min-w-0 flex flex-col gap-2">
                  {study.rows.slice(0, 5).map((r) => (
                    <li key={r.name} className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="text-[13px] text-label truncate flex-1">{r.name}</span>
                      <span className="text-[13px] font-semibold text-label-secondary shrink-0 tabular-nums">
                        {formatDuration(r.minutes)}<span className="text-label-tertiary font-normal"> · {r.pct}%</span>
                      </span>
                    </li>
                  ))}
                  {study.rows.length > 5 && (
                    <li className="text-[12px] text-label-tertiary">+{study.rows.length - 5} altre categorie</li>
                  )}
                </ul>
              </div>
            </>
          ) : (
            <EmptyHint text="Nessun tempo registrato: assegna minuti dal timer di studio o completa le attività." />
          )}
        </section>

        {/* 2. Allenamenti completati (cliccabile: apre mini-calendario) */}
        <section
          onClick={() => setWorkoutModalOpen(true)}
          className="card p-4 cursor-pointer hover:bg-white/[0.04] active:scale-[0.99] transition-all group"
          aria-label="Allenamenti completati"
        >
          <div className="flex items-center justify-between mb-2">
            <SectionLabel icon={<Dumbbell size={13} />} text="Allenamenti completati" />
            <span className="flex items-center gap-1 text-[11.5px] text-sky group-hover:underline">
              <CalendarDays size={13} /> Calendario <ChevronRight size={13} />
            </span>
          </div>
          {workouts.total > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-semibold text-label tracking-tight leading-none">{workouts.completed}</span>
                <span className="text-[13px] text-label-secondary">su {workouts.total}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5 items-end">
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-sky/15 text-sky text-[12px] font-semibold shrink-0">
                  <TrendingUp size={13} /> {String(workouts.perWeek).replace('.', ',')} a settimana
                </span>
                <span className="text-[12px] text-label-secondary">{formatDuration(workouts.totalMinutes)} totali</span>
              </div>
            </div>
          ) : (
            <EmptyHint text="Nessun allenamento nel periodo: tocca per visualizzare lo storico." />
          )}
        </section>

        {/* 3. Bilancio wallet (tap porta direttamente al Wallet) */}
        <section
          onClick={() => onOpenView('wallet')}
          className="card p-4 cursor-pointer hover:bg-white/[0.04] active:scale-[0.99] transition-all group"
          aria-label="Bilancio wallet"
        >
          <div className="flex items-center justify-between mb-2">
            <SectionLabel icon={<Receipt size={13} />} text="Bilancio / Wallet" />
            <span className="flex items-center gap-1 text-[11.5px] text-sky group-hover:underline">
              Apri Wallet <ChevronRight size={13} />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={cn('text-[30px] font-semibold tracking-tight leading-none', wallet.remaining < 0 ? 'text-[#ff453a]' : 'text-label')}>
              € {wallet.remaining.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[12px] text-label-secondary">{wallet.budgetAmount > 0 ? 'disponibili su budget settimanale' : 'bilancio attuale'}</span>
          </div>
          {wallet.budgetAmount > 0 && (
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mb-3" role="progressbar" aria-valuenow={wallet.usedPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-[width]" style={{ width: `${wallet.usedPct}%`, backgroundColor: budgetColor(wallet.usedPct / 100) }} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-label-secondary">Uscite nel periodo</span>
            <span className="text-[13px] font-semibold text-label tabular-nums">€ {wallet.spent.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[13px] text-label-secondary">Movimenti registrati</span>
            <span className="text-[13px] font-semibold text-label tabular-nums">{wallet.movements}</span>
          </div>
        </section>

        {/* 4. Aderenza alimentare (pulita, solo conteggio giorni su target) */}
        <section className="card p-4" aria-label="Aderenza alimentare">
          <SectionLabel icon={<Salad size={13} />} text="Aderenza alimentare" />
          {targetKcal > 0 ? (
            adherence.daysTracked > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[30px] font-semibold text-label tracking-tight leading-none">
                    {adherence.daysOnTarget}
                  </span>
                  <span className="text-[14px] text-label-secondary">
                    {adherence.daysOnTarget === 1 ? 'giorno a target raggiunto' : 'giorni a target raggiunto'} su {adherence.daysTracked} tracciati
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-[#30d158] transition-[width]" style={{ width: `${adherence.pct}%` }} />
                </div>
              </>
            ) : (
              <EmptyHint icon={<Target size={16} />} text="Nessun pasto registrato nel periodo: registra gli alimenti dalla sezione Nutrizione." />
            )
          ) : (
            <EmptyHint icon={<Target size={16} />} text="Definisci un obiettivo calorico nella sezione Nutrizione per tracciare l’aderenza." />
          )}
        </section>
      </div>

      {/* Mini-calendario degli allenamenti completati */}
      <WorkoutCalendarModal
        isOpen={workoutModalOpen}
        onClose={() => setWorkoutModalOpen(false)}
        selectedDate={selectedDate}
        routines={monthRoutines ?? routines ?? []}
      />
    </div>
  );
}

// ═══════════════════════ Sotto-componenti ═══════════════════════

function WorkoutCalendarModal({ isOpen, onClose, selectedDate, routines = [] }) {
  const [activeDate, setActiveDate] = useState(null);

  const monthStart = startOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });

  const dates = useMemo(() => {
    const res = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) res.push(d);
    return res;
  }, [gridStart, gridEnd]);

  // Mappa delle routine completate per data
  const workoutMap = useMemo(() => {
    const map = new Map();
    for (const r of routines) {
      const isDone = Boolean(r.completedAt || (r.steps || []).some((s) => s.completed));
      if (isDone && r.date) {
        const list = map.get(r.date) || [];
        list.push(r);
        map.set(r.date, list);
      }
    }
    return map;
  }, [routines]);

  const totalCompletedDays = workoutMap.size;
  const activeList = activeDate ? workoutMap.get(toDateKey(activeDate)) ?? [] : [];

  return (
    <LiquidDialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={400}
      title={
        <span className="flex items-center gap-2">
          <Dumbbell size={18} className="text-sky" />
          <span className="text-[18px] font-semibold text-label">
            Allenamenti di {format(selectedDate, 'MMMM yyyy', { locale: it })}
          </span>
        </span>
      }
    >
      <div className="pt-2 pb-4">
        {/* Statistica rapida */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[13px] text-label-secondary">
            {totalCompletedDays} {totalCompletedDays === 1 ? 'giorno di allenamento' : 'giorni di allenamento'} completati
          </span>
        </div>

        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 gap-1 text-center py-1.5 border-b border-white/[0.06] mb-2">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-[11px] font-semibold text-white/40">{d}</span>
          ))}
        </div>

        {/* Griglia mini-calendario */}
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {dates.map((date) => {
            const key = toDateKey(date);
            const hasWorkout = workoutMap.has(key);
            const count = (workoutMap.get(key) || []).length;
            const outside = !isSameMonth(date, selectedDate);
            const isTodayDate = isToday(date);
            const isSelected = activeDate && toDateKey(activeDate) === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDate(hasWorkout ? date : null)}
                className={cn(
                  'w-9 h-9 rounded-full flex flex-col items-center justify-center relative text-[13px] font-medium transition-all',
                  hasWorkout
                    ? 'bg-emerald-500/25 border border-emerald-400/40 text-white font-semibold shadow-sm shadow-emerald-500/30'
                    : isTodayDate
                      ? 'bg-accent/15 border border-accent/30 text-sky font-semibold'
                      : outside
                        ? 'text-white/20'
                        : 'text-white/70 hover:bg-white/10',
                  isSelected && 'ring-2 ring-sky'
                )}
                title={hasWorkout ? `${count} allenamento/i completato/i` : undefined}
              >
                <span>{format(date, 'd')}</span>
                {hasWorkout && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 -mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dettaglio del giorno selezionato */}
        {activeDate && activeList.length > 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
            <p className="text-[12px] font-semibold text-label capitalize mb-1.5">
              {format(activeDate, 'EEEE d MMMM', { locale: it })}
            </p>
            <div className="flex flex-col gap-1.5">
              {activeList.map((r, i) => {
                const totalSec = (r.steps || []).reduce((s, st) => s + (st.actualSeconds || 0), 0);
                return (
                  <div key={i} className="flex items-center justify-between text-[12.5px] text-label-secondary">
                    <span className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-label truncate">{r.routineName || 'Routine'}</span>
                    </span>
                    <span className="tabular-nums text-label-tertiary shrink-0">
                      {totalSec > 0 ? formatDuration(Math.round(totalSec / 60)) : 'Completato'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </LiquidDialog>
  );
}

function QuickCard({ onClick, icon, iconBg, iconColor, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      className="card tap-clean p-4 flex items-center gap-3 text-left min-w-0 active:bg-white/[0.06] transition-colors"
    >
      <span className="w-10 h-10 rounded-[12px] grid place-items-center shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-label leading-tight">{title}</span>
        <span className="block text-[12px] text-label-secondary truncate">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="text-label-tertiary shrink-0" />
    </button>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">
      <span className="shrink-0 inline-flex">{icon}</span>
      {text}
    </p>
  );
}

/** Donut recharts (dimensione fissa: niente ResponsiveContainer, jsdom-safe). */
function StudyDonut({ study }) {
  const data = study.rows.slice(0, 5);
  return (
    <div className="relative w-[132px] h-[132px] shrink-0" role="img" aria-label={`Ripartizione attività: ${study.rows.map((r) => `${r.name} ${r.pct}%`).join(', ')}`}>
      <PieChart width={132} height={132}>
        <Pie
          data={data}
          dataKey="minutes"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={44}
          outerRadius={62}
          paddingAngle={data.length > 1 ? 3 : 0}
          cornerRadius={6}
          stroke="none"
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          {data.map((r) => (
            <Cell key={r.name} fill={r.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <span className="text-[17px] font-semibold text-label leading-none tabular-nums">
          {minutesToHoursLabel(study.totalMinutes)}<span className="text-[11px] text-label-secondary font-medium"> h</span>
        </span>
      </div>
    </div>
  );
}

function EmptyHint({ text, icon }) {
  return (
    <p className="flex items-start gap-2.5 text-[13px] text-label-tertiary leading-snug py-1">
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <span>{text}</span>
    </p>
  );
}
