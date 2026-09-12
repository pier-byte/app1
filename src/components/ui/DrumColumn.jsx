import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/cn';

/**
 * DrumColumn — colonna "a tamburo" 3D stile iOS Liquid Glass (ui-references:
 * time_picker / month_year_picker a tamburo).
 *
 * Snap: `scroll-snap-type: y mandatory` + `scroll-snap-align: center` con
 * paddingi simmetrici → la voce selezionata si blocca ESATTAMENTE al centro
 * della banda. Lo stile attivo (colore pieno, bold, opacità 1) spetta
 * esclusivamente alla voce centrata; le adiacenti restano attenuate.
 */
export default function DrumColumn({ values, value, onChange, itemHeight = 48, visibleCount = 4, format = (v) => String(v), className, label }) {
  const CONTAINER_H = itemHeight * visibleCount + itemHeight * 0.34; // ~208px
  const PAD = (CONTAINER_H - itemHeight) / 2;
  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const lastIndexRef = useRef(null);
  const [active, setActive] = useState(() => {
    const idx = values.indexOf(value);
    return idx >= 0 ? idx : 0;
  });

  // Allinea la selezione quando cambia `value` dall'esterno (o al mount)
  useEffect(() => {
    const idx = values.indexOf(value);
    if (idx < 0 || idx === lastIndexRef.current) return;
    lastIndexRef.current = idx;
    setActive(idx);
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: idx * itemHeight, behavior: 'auto' });
    else el.scrollTop = idx * itemHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values]);

  const computeActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Centro esatto: round(scrollTop / itemHeight)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeActive]);

  // scrollend (dove disponibile): scatto finale → riallineamento esatto al centro
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof el.addEventListener !== 'function') return;
    const onEnd = () => {
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / itemHeight)));
      const target = idx * itemHeight;
      if (Math.abs(el.scrollTop - target) > 1) {
        if (typeof el.scrollTo === 'function') el.scrollTo({ top: target, behavior: 'smooth' });
        else el.scrollTop = target;
      }
      computeActive();
    };
    el.addEventListener('scrollend', onEnd);
    return () => el.removeEventListener('scrollend', onEnd);
  }, [computeActive, itemHeight, values.length]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const tapSelect = (idx) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function') el.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
    else el.scrollTop = idx * itemHeight;
  };

  return (
    <div
      ref={scrollerRef}
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
        const isActive = delta === 0;
        // Tamburo cilindrico: sopra rotateX positivo, sotto negativo
        const angle = dist === 1 ? 24 : 46;
        const transform = isActive
          ? 'rotateX(0deg) translateZ(12px) scale(1.08)'
          : `rotateX(${delta < 0 ? angle : -angle}deg) translateZ(${dist === 1 ? -12 : -34}px) scale(${dist === 1 ? 0.9 : 0.76})`;
        const opacity = isActive ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.28 : 0.14;
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => tapSelect(i)}
            className={cn(
              'drum-item tap-clean w-full flex items-center justify-center select-none cursor-pointer',
              isActive ? 'text-label font-bold' : 'text-[#98989d] font-medium'
            )}
            style={{ height: itemHeight, transform, opacity }}
          >
            <span className={isActive ? 'text-[26px] tabular-nums' : dist === 1 ? 'text-[21px] tabular-nums' : 'text-[19px] tabular-nums'}>
              {format(v)}
            </span>
          </button>
        );
      })}
      <div style={{ height: PAD }} aria-hidden />
    </div>
  );
}
