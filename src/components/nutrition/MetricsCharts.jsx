import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, Scale, Ruler, TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog } from '../ui/Dialog';
import DatePickerDialog from '../school/DatePickerDialog';
import { cn } from '../../lib/cn';

/**
 * MetricsCharts — Tracciamento Peso (kg) e Altezza (cm) con grafici Recharts.
 * Le registrazioni sono modificabili/eliminabili a posteriori (tap su ✏️):
 * aggiunte rapide per la data selezionata aggiornano la misura esistente.
 */
export default function MetricsCharts({ metrics, onAdd, onUpdate, onRemove, defaultDate }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [editing, setEditing] = useState(null); // { id, date, weightKg, heightCm }
  const [datePickFor, setDatePickFor] = useState(null); // null | 'edit'

  const data = useMemo(
    () =>
      metrics.map((m) => ({
        date: m.date,
        label: format(parseISO(m.date), 'd MMM', { locale: it }),
        peso: m.weightKg ?? null,
        altezza: m.heightCm ?? null,
      })),
    [metrics]
  );

  const lastWeight = [...metrics].reverse().find((m) => m.weightKg != null);
  const prevWeight = metrics.length >= 2 ? metrics[metrics.length - 2] : null;
  const lastHeight = [...metrics].reverse().find((m) => m.heightCm != null);
  const delta = lastWeight && prevWeight?.weightKg != null && lastWeight.date !== prevWeight.date
    ? Math.round((lastWeight.weightKg - prevWeight.weightKg) * 10) / 10
    : null;

  const metricForDate = metrics.find((m) => m.date === defaultDate);

  const addWeight = () => {
    const v = parseFloat(weight.replace(',', '.'));
    if (!isNaN(v) && v > 20 && v < 300) {
      if (metricForDate) onUpdate(metricForDate._id, { weightKg: v });
      else onAdd({ weightKg: v });
      setWeight('');
    }
  };
  const addHeight = () => {
    const v = parseFloat(height.replace(',', '.'));
    if (!isNaN(v) && v > 50 && v < 250) {
      if (metricForDate) onUpdate(metricForDate._id, { heightCm: v });
      else onAdd({ heightCm: v });
      setHeight('');
    }
  };

  const saveEdit = () => {
    if (!editing) return;
    const patch = { date: editing.date };
    if (editing.weightKg !== '') patch.weightKg = Number(editing.weightKg);
    if (editing.heightCm !== '') patch.heightCm = Number(editing.heightCm);
    onUpdate(editing.id, patch);
    setEditing(null);
  };

  const recent = useMemo(() => [...metrics].reverse().slice(0, 6), [metrics]);

  const tooltipStyle = {
    backgroundColor: '#2c2c2e',
    border: '1px solid rgba(84,84,88,0.65)',
    borderRadius: 10,
    fontSize: 12,
    color: '#fff',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input rapidi (aggiornano la misura del giorno selezionato) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Scale size={15} className="text-sky" />
            <span className="text-[13px] font-semibold text-label">Peso</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[26px] font-semibold text-label tracking-tight tabular-nums">
              {lastWeight ? lastWeight.weightKg : '—'}
            </span>
            <span className="text-[13px] text-label-tertiary">kg</span>
            {delta !== null && delta !== 0 && (
              <span className={cn('flex items-center text-[12px] font-semibold ml-1', delta < 0 ? 'text-sys-green' : 'text-sys-orange')}>
                {delta < 0 ? <TrendingDown size={12} className="mr-0.5" /> : <TrendingUp size={12} className="mr-0.5" />}
                {Math.abs(delta)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWeight()}
              inputMode="decimal"
              placeholder={metricForDate?.weightKg != null ? String(metricForDate.weightKg) : 'es. 53,4'}
              className="flex-1 min-w-0 bg-surface-2 rounded-lg px-3 h-9 text-[14px] text-label placeholder:text-label-tertiary"
            />
            <button
              onClick={addWeight}
              disabled={!weight.trim()}
              className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Aggiungi peso"
            >
              <Plus size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Ruler size={15} className="text-sys-teal" />
            <span className="text-[13px] font-semibold text-label">Altezza</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[26px] font-semibold text-label tracking-tight tabular-nums">
              {lastHeight ? lastHeight.heightCm : '—'}
            </span>
            <span className="text-[13px] text-label-tertiary">cm</span>
          </div>
          <div className="flex gap-2">
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHeight()}
              inputMode="decimal"
              placeholder={metricForDate?.heightCm != null ? String(metricForDate.heightCm) : 'es. 165'}
              className="flex-1 min-w-0 bg-surface-2 rounded-lg px-3 h-9 text-[14px] text-label placeholder:text-label-tertiary"
            />
            <button
              onClick={addHeight}
              disabled={!height.trim()}
              className="w-9 h-9 rounded-lg bg-sys-teal flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Aggiungi altezza"
            >
              <Plus size={16} className="text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Registrazioni recenti: tap su ✏️ per correggere i valori */}
      {recent.length > 0 && (
        <div className="card overflow-hidden">
          <p className="text-[12px] font-semibold text-label-tertiary uppercase tracking-wide px-4 pt-3 pb-1">Registrazioni</p>
          {recent.map((m) => (
            <div key={m._id} className="flex items-center gap-3 px-4 py-2.5 border-t border-separator">
              <span className="flex-1 text-[13px] text-label-secondary capitalize">
                {format(parseISO(m.date), 'EEEE d MMM', { locale: it })}
              </span>
              <span className="text-[14px] text-label tabular-nums w-20 text-right">
                {m.weightKg != null ? `${m.weightKg} kg` : '—'}
              </span>
              <span className="text-[14px] text-label tabular-nums w-20 text-right">
                {m.heightCm != null ? `${m.heightCm} cm` : '—'}
              </span>
              <button
                onClick={() => setEditing({ id: m._id, date: m.date, weightKg: m.weightKg ?? '', heightCm: m.heightCm ?? '' })}
                className="w-9 h-9 grid place-items-center text-label-tertiary active:text-sky"
                aria-label="Modifica registrazione"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onRemove(m._id)}
                className="w-9 h-9 grid place-items-center text-label-tertiary active:text-sys-red"
                aria-label="Elimina registrazione"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grafico peso */}
      <ChartCard title="Peso (kg)" color="#2997ff" data={data} dataKey="peso" empty={data.every((d) => d.peso == null)}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(84,84,88,0.3)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(10,132,255,0.4)' }} />
          <Line type="monotone" dataKey="peso" stroke="#2997ff" strokeWidth={2.5} dot={{ r: 3, fill: '#2997ff' }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ChartCard>

      {/* Grafico altezza */}
      <ChartCard title="Altezza (cm)" color="#64d2ff" data={data} dataKey="altezza" empty={data.every((d) => d.altezza == null)}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(84,84,88,0.3)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(100,210,255,0.4)' }} />
          <Line type="monotone" dataKey="altezza" stroke="#64d2ff" strokeWidth={2.5} dot={{ r: 3, fill: '#64d2ff' }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ChartCard>

      {/* Modifica registrazione */}
      <Dialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Modifica registrazione"
        actions={
          <>
            <button onClick={() => setEditing(null)} className="text-[17px] text-label-secondary font-medium active:opacity-60">Annulla</button>
            <button onClick={saveEdit} className="text-[17px] text-sky font-semibold active:opacity-60">Salva</button>
          </>
        }
      >
        {editing && (
          <div className="py-1">
            <button
              onClick={() => setDatePickFor('edit')}
              className="w-full flex items-center justify-between bg-surface-2 rounded-xl px-4 py-3 mb-3 active:opacity-70"
            >
              <span className="text-[14px] text-label-secondary capitalize">
                {format(parseISO(editing.date), 'EEEE d MMMM yyyy', { locale: it })}
              </span>
              <span className="text-[12px] text-label-tertiary">Cambia ›</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <label className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
                Peso (kg)
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={editing.weightKg}
                  onChange={(e) => setEditing((s) => ({ ...s, weightKg: e.target.value }))}
                  className="w-full bg-transparent text-[16px] font-semibold text-label"
                  inputMode="decimal"
                />
              </label>
              <label className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
                Altezza (cm)
                <input
                  type="number"
                  min="50"
                  max="250"
                  value={editing.heightCm}
                  onChange={(e) => setEditing((s) => ({ ...s, heightCm: e.target.value }))}
                  className="w-full bg-transparent text-[16px] font-semibold text-label"
                  inputMode="numeric"
                />
              </label>
            </div>
          </div>
        )}
      </Dialog>

      {/* Cambia data della registrazione (calendario Liquid Glass) */}
      <DatePickerDialog
        isOpen={datePickFor === 'edit' && !!editing}
        onClose={() => setDatePickFor(null)}
        value={editing?.date}
        onConfirm={(key) => setEditing((s) => ({ ...s, date: key }))}
      />
    </div>
  );
}

function ChartCard({ title, color, children, empty }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[14px] font-semibold text-label">{title}</span>
      </div>
      {empty ? (
        <p className="text-[13px] text-label-tertiary text-center py-8">Nessun dato ancora</p>
      ) : (
        <div className="h-40 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
