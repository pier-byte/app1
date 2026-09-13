import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '../../lib/cn';

/**
 * DrumColumn — colonna "a tamburo" 3D stile iOS Liquid Glass
 * con infinite loop, inerzia touch fluida e snap perfetto al centro.
 */
export default function DrumColumn({
  values,
  value,
  onChange,
  itemHeight = 48,
  visibleCount = 5,
  format = (v) => String(v),
  className,
  label,
  infinite = true,
}) {
  const count = values.length;
  const REPEATS = infinite && count > 1 ? 51 : 1;
  const CENTER_CYCLE = Math.floor(REPEATS / 2);

  const CONTAINER_H = itemHeight * visibleCount; // 48 * 5 = 240px
  const PAD = (CONTAINER_H - itemHeight) / 2; // (240 - 48) / 2 = 96px (esattamente 2 elementi sopra e 2 sotto)

  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const scrollTimeoutRef = useRef(0);
  const isProgrammaticScroll = useRef(false);
  const lastIndexRef = useRef(null);

  const initialIndex = useMemo(() => {
    const idx = values.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [values, value]);

  const [active, setActive] = useState(initialIndex);

  // Generazione della lista di elementi (ripetuta se infinite)
  const items = useMemo(() => {
    if (REPEATS === 1) {
      return values.map((val, idx) => ({ val, origIndex: idx, key: `${val}-${idx}` }));
    }
    const list = [];
    for (let c = 0; c < REPEATS; c++) {
      const cycleOffset = c * count;
      for (let i = 0; i < count; i++) {
        list.push({
          val: values[i],
          origIndex: i,
          itemIndex: cycleOffset + i,
          key: `c${c}-${values[i]}-${i}`,
        });
      }
    }
    return list;
  }, [values, count, REPEATS]);

  // Posizionamento iniziale o aggiornamento esterno
  useEffect(() => {
    const idx = values.indexOf(value);
    if (idx < 0) return;
    const currentActive = lastIndexRef.current;
    if (idx === currentActive) return;

    lastIndexRef.current = idx;
    setActive(idx);

    const el = scrollerRef.current;
    if (!el) return;

    const targetItemIndex = infinite ? CENTER_CYCLE * count + idx : idx;
    isProgrammaticScroll.current = true;
    el.scrollTop = targetItemIndex * itemHeight;
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 50);
  }, [value, values, count, infinite, CENTER_CYCLE, itemHeight]);

  // Calcolo dell'indice attivo dal scrollTop
  const computeActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || count === 0) return;

    const rawIdx = Math.round(el.scrollTop / itemHeight);
    const normalizedIdx = ((rawIdx % count) + count) % count;

    if (normalizedIdx !== lastIndexRef.current) {
      lastIndexRef.current = normalizedIdx;
      setActive(normalizedIdx);
      onChange?.(values[normalizedIdx]);
    }
  }, [count, itemHeight, onChange, values]);

  // Ricentramento invisibile se ci si allontana troppo dal blocco centrale
  const checkNormalizeInfinite = useCallback(() => {
    if (!infinite || count <= 1) return;
    const el = scrollerRef.current;
    if (!el) return;

    const rawIdx = Math.round(el.scrollTop / itemHeight);
    const minSafe = (CENTER_CYCLE - 12) * count;
    const maxSafe = (CENTER_CYCLE + 12) * count;

    if (rawIdx < minSafe || rawIdx > maxSafe) {
      const normalizedIdx = ((rawIdx % count) + count) % count;
      const targetItemIndex = CENTER_CYCLE * count + normalizedIdx;
      isProgrammaticScroll.current = true;
      el.scrollTop = targetItemIndex * itemHeight;
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 50);
    }
  }, [infinite, count, CENTER_CYCLE, itemHeight]);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      computeActive();
    });

    // Controllo fine scroll per snap esatto e normalizzazione infinita silenziosa
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      checkNormalizeInfinite();
      const el = scrollerRef.current;
      if (el) {
        const rawIdx = Math.round(el.scrollTop / itemHeight);
        const targetScroll = rawIdx * itemHeight;
        if (Math.abs(el.scrollTop - targetScroll) > 1 && !isProgrammaticScroll.current) {
          el.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }
      }
    }, 120);
  }, [computeActive, checkNormalizeInfinite, itemHeight]);

  const tapSelect = (targetIndex, origIdx) => {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(origIdx);
    lastIndexRef.current = origIdx;
    onChange?.(values[origIdx]);
    el.scrollTo({ top: targetIndex * itemHeight, behavior: 'smooth' });
  };

  return (
    <div
      ref={scrollerRef}
      className={cn('relative flex-1 min-w-0 drum-scroller overflow-y-auto select-none', className)}
      style={{
        height: CONTAINER_H,
        scrollPaddingTop: `${PAD}px`,
        scrollPaddingBottom: `${PAD}px`,
      }}
      onScroll={handleScroll}
      role="listbox"
      aria-label={label}
    >
      <div style={{ height: PAD }} aria-hidden />

      {items.map((item, i) => {
        const delta = Math.abs(item.origIndex - active);
        const dist = Math.min(delta, count - delta); // minima distanza circolare
        const isActive = item.origIndex === active;
        const text = format(item.val);
        const textLen = String(text).length;

        // Adattamento dinamico dimensione testo (es. Settembre / Novembre)
        let textSize = 'text-[24px]';
        if (textLen >= 9) textSize = isActive ? 'text-[16px]' : 'text-[14px]';
        else if (textLen >= 8) textSize = isActive ? 'text-[17px]' : 'text-[15px]';
        else if (textLen >= 6) textSize = isActive ? 'text-[19px]' : 'text-[16px]';
        else textSize = isActive ? 'text-[24px]' : 'text-[20px]';

        // Effetto 3D e dissolvenza
        const opacity = isActive ? 1 : dist === 1 ? 0.65 : dist === 2 ? 0.28 : 0.12;
        const angle = dist === 1 ? 22 : dist >= 2 ? 44 : 0;
        const transform = isActive
          ? 'scale(1.04)'
          : `rotateX(${item.origIndex < active ? angle : -angle}deg) scale(0.92)`;

        return (
          <button
            key={item.key}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => tapSelect(i, item.origIndex)}
            className={cn(
              'drum-item tap-clean w-full flex items-center justify-center select-none cursor-pointer px-1',
              isActive ? 'text-label font-bold' : 'text-[#98989d] font-medium'
            )}
            style={{
              height: itemHeight,
              transform,
              opacity,
            }}
          >
            <span className={cn('tabular-nums leading-none truncate max-w-full text-center tracking-tight', textSize)}>
              {text}
            </span>
          </button>
        );
      })}

      <div style={{ height: PAD }} aria-hidden />
    </div>
  );
}
