import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, Scale, Ruler, TrendingDown, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../../lib/cn';

/**
 * MetricsCharts — Tracciamento Peso (kg) e Altezza (cm) con grafici Recharts.
 */
export default function MetricsCharts({ metrics, onAdd }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

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

  const addWeight = () => {
    const v = parseFloat(weight.replace(',', '.'));
    if (!isNaN(v) && v > 20 && v < 300) {
      onAdd({ weightKg: v });
      setWeight('');
    }
  };
  const addHeight = () => {
    const v = parseFloat(height.replace(',', '.'));
    if (!isNaN(v) && v > 50 && v < 250) {
      onAdd({ heightCm: v });
      setHeight('');
    }
  };

  const tooltipStyle = {
    backgroundColor: '#2c2c2e',
    border: '1px solid rgba(84,84,88,0.65)',
    borderRadius: 10,
    fontSize: 12,
    color: '#fff',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input rapidi */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-1 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Scale size={15} className="text-accent" />
            <span className="text-[13px] font-semibold text-label">Peso</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[26px] font-bold text-label tracking-tight tabular-nums">
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
              placeholder="es. 53,4"
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

        <div className="bg-surface-1 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Ruler size={15} className="text-sys-teal" />
            <span className="text-[13px] font-semibold text-label">Altezza</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[26px] font-bold text-label tracking-tight tabular-nums">
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
              placeholder="es. 165"
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

      {/* Grafico peso */}
      <ChartCard title="Peso (kg)" color="#0a84ff" data={data} dataKey="peso" empty={data.every((d) => d.peso == null)}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(84,84,88,0.3)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(10,132,255,0.4)' }} />
          <Line type="monotone" dataKey="peso" stroke="#0a84ff" strokeWidth={2.5} dot={{ r: 3, fill: '#0a84ff' }} activeDot={{ r: 5 }} connectNulls />
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
    </div>
  );
}

function ChartCard({ title, color, children, empty }) {
  return (
    <div className="bg-surface-1 rounded-2xl p-4">
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
