import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/cn';

/**
 * DrumColumn — colonna "a tamburo" 3D stile iOS Liquid Glass (ui-references:
 * time_picker / month_year_picker a tamburo). Scroll-snap nativo + tap per
 * selezionare; le righe lontane ruotano su X (effetto cilindro) e sfumano.
 *
 * Non è controllata dal parent durante lo scroll: emette `onChange` ad ogni
 * scatto e si riallinea solo se `value` cambia dall'esterno.
 */
export default function DrumColumn({ values, value, onChange, itemHeight = 48, visibleCount = 4, format = (v) => String(v), className, label }) {
  const CONTAINER_H = itemHeight * visibleCount + itemHeight * 0.34; // ~208px con 4+frizione
  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const settleRef = useRef(0);
  const lastIndexRef = useRef(null);
  const [active, setActive] = useState(() => {
    const idx = values.indexOf(value);
    return idx >= 0 ? idx : 0;
  });

  const PAD = (CONTAINER_H - itemHeight) / 2;

  // Allinea la selezione quando cambia `value` dall'esterno (o al mount)
  useEffect(() => {
    const idx = values.indexOf(value);
    if (idx < 0) return;
    if (idx === lastIndexRef.current) return;
    lastIndexRef.current = idx;
    setActive(idx);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: idx * itemHeight, behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values]);

  const computeActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / itemHeight)));
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setActive(idx);
      onChange?.(values[idx]);
    }
  }, [values, itemHeight, onChange]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(computeActive);
    // "settle": normalizza lo scroll allo scatto esatto del tamburo
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / itemHeight)));
      el.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
      computeActive();
    }, 140);
  }, [computeActive, itemHeight, values.length]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearTimeout(settleRef.current); }, []);

  const tapSelect = (idx) => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
  };

  return (
    <div
      className={cn('relative flex-1 min-w-0 drum-scroller overflow-y-auto', className)}
      style={{ height: CONTAINER_H }}
      onScroll={handleScroll}
      role="listbox"
      aria-label={label}
    >
      <div style={{ height: PAD }} aria-hidden />
      {values.map((v, i) => {
        const delta = i - active;
        const dist = Math.min(Math.abs(delta), 3);
        // Tamburo cilindrico: sopra rotateX positivo, sotto negativo
        const angle = dist === 1 ? 24 : 46;
        const transform =
          delta === 0
            ? 'rotateX(0deg) translateZ(12px) scale(1.08)'
            : `rotateX(${delta < 0 ? angle : -angle}deg) translateZ(${dist === 1 ? -12 : -34}px) scale(${dist === 1 ? 0.9 : 0.76})`;
        const opacity = delta === 0 ? 1 : dist === 1 ? 0.68 : dist === 2 ? 0.32 : 0.16;
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={delta === 0}
            onClick={() => tapSelect(i)}
            className={cn(
              'drum-item w-full flex items-center justify-center select-none cursor-pointer',
              delta === 0 ? 'text-label font-semibold' : dist === 1 ? 'text-[#c7c7cc] font-medium' : 'text-[#8e8e93] font-medium'
            )}
            style={{
              height: itemHeight,
              transform,
              opacity,
            }}
          >
            <span className={delta === 0 ? 'text-[24px] md:text-[26px]' : dist === 1 ? 'text-[21px]' : 'text-[19px]'}>{format(v)}</span>
          </button>
        );
      })}
      <div style={{ height: PAD }} aria-hidden />
    </div>
  );
}
