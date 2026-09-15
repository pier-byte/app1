import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * DrumColumn — colonna "a tamburo" 3D stile iOS Liquid Glass
 * (ui-references/time_picker_a_tamburo_3d_liquid_glass).
 *
 * FISICA RISCRIPTA per 60fps reali su Android:
 * - niente scroll nativo né scroll-snap: il gesto è gestito con Pointer Events
 *   (touch-action: none) → nessun conflitto col browser, nessun glitch di
 *   rendering durante il fast-swipe;
 * - inerzia con frizione esponenziale + snap morbido easeOutCubic (~150-220ms)
 *   che parte IMMEDIATAMENTE quando la velocità scende sotto soglia: lo snap
 *   al centro è istantaneo e reattivo, senza il ritardo del vecchio debounce;
 * - rendering imperativo: solo `visibleCount + 2` slot virtuali vengono
 *   renderizzati; transform/opacity sono scritti direttamente sul DOM dentro
 *   un requestAnimationFrame (zero re-render React per frame). React ri-render
 *   soltanto quando cambia l'indice centrale (7 nodi, una volta per step);
 * - loop infinito senza desincronizzazioni: l'indice è calcolato modulo
 *   `values.length`, quindi non esiste "fine corsa" né normalizzazione
 *   silenziosa dello scrollTop (la causa dei blocchi anomali precedenti).
 *
 * API invariata: values, value, onChange, itemHeight, visibleCount, format,
 * label, infinite (false = clamp agli estremi, es. colonna anni).
 */

const mod = (n, m) => ((n % m) + m) % m;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Adattamento dinamico del testo (Settembre vs Mar, ecc.) */
function textSizeFor(text, isActive) {
  const len = String(text).length;
  if (len >= 9) return isActive ? 'text-[16px]' : 'text-[14px]';
  if (len >= 8) return isActive ? 'text-[17px]' : 'text-[15px]';
  if (len >= 6) return isActive ? 'text-[19px]' : 'text-[16px]';
  return isActive ? 'text-[24px]' : 'text-[20px]';
}

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
  const CONTAINER_H = itemHeight * visibleCount;
  const SLOTS = visibleCount + 2; // 2 slot-buffer sopra e sotto per il fade
  const HALF = Math.floor(SLOTS / 2);

  const rootRef = useRef(null);
  const slotRefs = useRef([]);
  const offsetRef = useRef(null); // "scrollTop" virtuale in px
  const velRef = useRef(0); // px/ms
  const modeRef = useRef('idle'); // idle | drag | inertia | snap
  const dragRef = useRef(null);
  const snapRef = useRef(null);
  const frameRef = useRef(0);
  const lastTsRef = useRef(0);
  const wheelTimerRef = useRef(0);
  const centerRef = useRef(0);
  const emitRef = useRef(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initialIndex = useMemo(() => {
    const idx = values.indexOf(value);
    return idx >= 0 ? idx : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [center, setCenter] = useState(initialIndex);

  // Init offset una sola volta (lazy ref)
  if (offsetRef.current === null) {
    offsetRef.current = initialIndex * itemHeight;
    centerRef.current = initialIndex;
    emitRef.current = values[initialIndex];
  }

  // ─────────────────────────── painting imperativo ───────────────────────────
  const paint = () => {
    const off = offsetRef.current;
    const c = Math.round(off / itemHeight);
    const frac = off / itemHeight - c;
    for (let k = -HALF; k <= HALF; k++) {
      const node = slotRefs.current[k + HALF];
      if (!node) continue;
      const d = k - frac; // distanza (in item) dal centro visivo
      const ad = Math.abs(d);
      const y = CONTAINER_H / 2 - itemHeight / 2 + d * itemHeight;
      const rot = clamp(-d * 24, -52, 52);
      const scale = 1 - clamp(ad, 0, 2) * 0.05;
      const opacity = ad < 0.01 ? 1 : clamp(1 - (ad - 0.15) * 0.42, 0, 1);
      node.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotateX(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      node.style.opacity = opacity.toFixed(3);
    }
  };

  const commitCenter = (c) => {
    if (c === centerRef.current) return;
    centerRef.current = c;
    setCenter(c);
    const v = count > 0 ? values[mod(c, count)] : undefined;
    if (v !== emitRef.current) {
      emitRef.current = v;
      onChangeRef.current?.(v);
    }
  };

  const applyOffset = (next) => {
    let off = next;
    if (!infinite && count > 0) {
      off = clamp(off, 0, (count - 1) * itemHeight);
      if (off !== next) velRef.current = 0;
    }
    offsetRef.current = off;
    commitCenter(Math.round(off / itemHeight));
    paint();
  };

  // ─────────────────────────── loop rAF (inerzia + snap) ───────────────────────────
  const stopLoop = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  };

  const startSnap = (target, dur = 160) => {
    // start = 0 → ancorato al primo timestamp rAF del loop (coerente con `ts`,
    // ovunque: browser e ambienti jsdom dove performance.now() può divergere)
    snapRef.current = { from: offsetRef.current, to: target, start: 0, dur };
    modeRef.current = 'snap';
    if (!frameRef.current) {
      lastTsRef.current = 0;
      frameRef.current = requestAnimationFrame(loop);
    }
  };

  function loop(ts) {
    const dt = Math.min(48, ts - (lastTsRef.current || ts));
    lastTsRef.current = ts;
    const mode = modeRef.current;

    if (mode === 'inertia') {
      const steps = dt / 16.667;
      velRef.current *= Math.pow(0.935, steps); // frizione esponenziale
      applyOffset(offsetRef.current + velRef.current * dt);
      if (Math.abs(velRef.current) < 0.05 || (!infinite && (offsetRef.current <= 0 || offsetRef.current >= (count - 1) * itemHeight))) {
        // snap immediato e morbido sull'elemento più vicino al centro
        startSnap(Math.round(offsetRef.current / itemHeight) * itemHeight, 170);
        return; // startSnap riavvia il loop
      }
    } else if (mode === 'snap') {
      const s = snapRef.current;
      if (!s.start) s.start = ts; // ancora lo snap al clock del rAF
      const p = clamp((ts - s.start) / s.dur, 0, 1);
      const e = easeOutCubic(p);
      offsetRef.current = s.from + (s.to - s.from) * e;
      commitCenter(Math.round(offsetRef.current / itemHeight));
      paint();
      if (p >= 1) {
        offsetRef.current = s.to;
        commitCenter(Math.round(s.to / itemHeight));
        paint();
        modeRef.current = 'idle';
        stopLoop();
        return;
      }
    } else {
      stopLoop();
      return;
    }
    frameRef.current = requestAnimationFrame(loop);
  }

  // ─────────────────────────── gesture (pointer events) ───────────────────────────
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stopLoop();
    clearTimeout(wheelTimerRef.current);
    modeRef.current = 'drag';
    dragRef.current = { id: e.pointerId, y: e.clientY, startY: e.clientY, t: performance.now(), v: 0, moved: false };
    try {
      rootRef.current?.setPointerCapture(e.pointerId);
    } catch { /* jsdom / browser senza capture */ }
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const now = performance.now();
    const dy = e.clientY - d.y;
    const dt = Math.max(1, now - d.t);
    if (Math.abs(e.clientY - d.startY) > 6) d.moved = true;
    // velocità instantanea mediata (smooth 75/25) per inerzia stabile
    d.v = d.v * 0.75 + (-dy / dt) * 0.25;
    d.y = e.clientY;
    d.t = now;
    applyOffset(offsetRef.current - dy);
  };

  const endDrag = (e, cancelled = false) => {
    const d = dragRef.current;
    if (!d || (e && e.pointerId !== d.id)) return;
    dragRef.current = null;
    try {
      rootRef.current?.releasePointerCapture?.(d.id);
    } catch { /* noop */ }

    if (cancelled) {
      startSnap(Math.round(offsetRef.current / itemHeight) * itemHeight, 140);
      return;
    }

    // Tap senza movimento → seleziona lo slot toccato (snap dolce su di esso)
    if (!d.moved && e) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) {
        // (in ambienti senza layout, es. jsdom, rect.height è 0: top = 0)
        const top = rect.height > 0 ? rect.top : 0;
        const frac = offsetRef.current / itemHeight - Math.round(offsetRef.current / itemHeight);
        const k = Math.round((e.clientY - top - CONTAINER_H / 2) / itemHeight + frac);
        if (k !== 0) {
          const target = (Math.round(offsetRef.current / itemHeight) + clamp(k, -HALF, HALF)) * itemHeight;
          startSnap(clampTarget(target), 220);
          return;
        }
      }
    }

    const v = clamp(d.v, -4, 4); // px/ms
    if (Math.abs(v) > 0.25) {
      velRef.current = v;
      modeRef.current = 'inertia';
      if (!frameRef.current) {
        lastTsRef.current = 0;
        frameRef.current = requestAnimationFrame(loop);
      }
    } else {
      startSnap(Math.round(offsetRef.current / itemHeight) * itemHeight, 140);
    }
  };

  const clampTarget = (t) =>
    !infinite && count > 0 ? clamp(t, 0, (count - 1) * itemHeight) : t;

  // Wheel desktop: step + snap debounced brevissimo
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      stopLoop();
      const unit = e.deltaMode === 1 ? itemHeight : e.deltaMode === 2 ? CONTAINER_H : 1;
      applyOffset(offsetRef.current + e.deltaY * unit * (e.deltaMode === 0 ? 0.6 : 1));
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        startSnap(Math.round(offsetRef.current / itemHeight) * itemHeight, 140);
      }, 90);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemHeight, CONTAINER_H, infinite, count]);

  // Accessibilità da tastiera
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      startSnap(clampTarget((Math.round(offsetRef.current / itemHeight) + dir) * itemHeight), 160);
    }
  };

  // ─────────────────────────── sync valore esterno ───────────────────────────
  useEffect(() => {
    if (count === 0) return;
    const idx = values.indexOf(value);
    if (idx < 0) return;
    const cur = mod(centerRef.current, count);
    if (cur === idx) {
      emitRef.current = value;
      return;
    }
    // percorso più breve sul ciclo (per colonne infinite)
    let delta = idx - cur;
    if (infinite) {
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
    }
    const target = clampTarget(Math.round(offsetRef.current / itemHeight) * itemHeight + delta * itemHeight);
    startSnap(target, 240);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values, count, infinite, itemHeight]);

  // Cleanup
  useEffect(() => () => {
    stopLoop();
    clearTimeout(wheelTimerRef.current);
  }, []);

  // Ridipinge dopo ogni re-render (cambio etichette slot)
  useEffect(() => {
    paint();
  });

  const activeValue = count > 0 ? values[mod(center, count)] : undefined;

  return (
    <div
      ref={rootRef}
      className={cn('drum-scroller relative flex-1 min-w-0 select-none overflow-hidden', className)}
      style={{ height: CONTAINER_H }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={label}
      aria-valuetext={activeValue !== undefined ? format(activeValue) : undefined}
    >
      {Array.from({ length: SLOTS }, (_, s) => {
        const k = s - HALF;
        const itemIndex = center + k;
        const val = count > 0 ? values[mod(itemIndex, count)] : null;
        const isCenter = k === 0;
        const text = val === null || val === undefined ? '' : format(val);
        return (
          <div
            key={s}
            ref={(el) => {
              slotRefs.current[s] = el;
            }}
            role="option"
            aria-selected={isCenter}
            className={cn(
              'drum-slot absolute inset-x-0 top-0 flex items-center justify-center px-1',
              isCenter ? 'text-label font-bold' : 'text-[#98989d] font-medium'
            )}
            style={{ height: itemHeight }}
          >
            <span className={cn('tabular-nums leading-none truncate max-w-full text-center tracking-tight', textSizeFor(text, isCenter))}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
