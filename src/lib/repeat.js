/**
 * Logica di ripetizione degli eventi/compiti (stile "Ripeti" iOS):
 * - nessuna, giornaliera, feriali (Lun–Ven), settimanale (giorni scelti), mensile
 * - fine: mai, dopo N occorrenze, in una data
 *
 * L'evento è salvato sul database solo con la data di partenza; le occorrenze
 * vengono "espanse" lato client per la data richiesta.
 */
import { addDays, addMonths, differenceInCalendarDays, getDay, isSameDay, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toDateKey } from './dates';

/** giorno della settimana in stile lun=1 … dom=7 (come date-fns weekStartsOn:1) */
export function isoWeekday(date) {
  return getDay(date) === 0 ? 7 : getDay(date);
}

/** Numero massimo di istanze generate per una serie (protezione anti-loop). */
export const MAX_SERIES_INSTANCES = 365;

/** true se la regola di ripetizione è attiva (frequenza diversa da "none"). */
export function hasRepeatRule(repeat) {
  return !!repeat && !!repeat.frequency && repeat.frequency !== 'none';
}

/**
 * Calcola tutte le date (YYYY-MM-DD) di una serie ricorrente, inclusa la data
 * base come occorrenza #1. Usato per MATERIALIZZARE le istanze nel DB/stato:
 * ogni data diventa un task reale, così serie e calendario restano coerenti.
 *
 * Regole:
 * - endMode 'after' N → esattamente N istanze (base + N-1 successive)
 * - endMode 'on' data → istanze fino a quella data (inclusa)
 * - endMode 'never' → finestra di 365 giorni dalla base (modificando la serie
 *   si rigenera la finestra)
 * - mai più di `cap` istanze (default 365)
 */
export function computeOccurrenceDates(baseKey, repeat, options = {}) {
  const cap = Math.min(Math.max(options.cap ?? MAX_SERIES_INSTANCES, 1), 1000);
  const base = parseISO(baseKey);
  if (Number.isNaN(base.getTime())) return [];
  if (!hasRepeatRule(repeat)) return [baseKey];

  const freq = repeat.frequency;
  const endMode = repeat.endMode === 'after' || repeat.endMode === 'on' ? repeat.endMode : 'never';
  const maxCount = endMode === 'after' ? Math.max(1, Math.floor(repeat.endAfter || 5)) : Infinity;
  const endDate = endMode === 'on' && repeat.endDate ? repeat.endDate : null;
  const windowEnd = endMode === 'never' ? toDateKey(addDays(base, MAX_SERIES_INSTANCES - 1)) : null;

  // occorrenza #1 = sempre la data base (l'istanza principale della serie)
  const out = [baseKey];
  const accept = (key) => {
    if (out.length >= cap) return 'stop';
    if (out.length >= maxCount) return 'stop';
    if (endDate && key > endDate) return 'stop';
    if (windowEnd && key > windowEnd) return 'stop';
    out.push(key);
    return 'ok';
  };

  if (freq === 'monthly') {
    // addMonths sulla base (niente deriva: 31 gen → 28 feb → 31 mar …)
    for (let k = 1; k <= 1200; k++) {
      if (accept(toDateKey(addMonths(base, k))) === 'stop') break;
    }
    return out;
  }

  const days = repeat.weekdays?.length ? repeat.weekdays : [isoWeekday(base)];
  const matches = (d) => {
    if (freq === 'daily') return true;
    if (freq === 'weekdays') {
      const wd = isoWeekday(d);
      return wd >= 1 && wd <= 5;
    }
    if (freq === 'weekly') return days.includes(isoWeekday(d));
    return false;
  };

  let cursor = addDays(base, 1);
  for (;;) {
    // guardia anti-loop: mai oltre ~3 anni dalla base
    if (differenceInCalendarDays(cursor, base) > 366 * 3) break;
    if (matches(cursor) && accept(toDateKey(cursor)) === 'stop') break;
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * Sposta i promemoria su un'altra data mantenendo l'ora locale
 * (es. "09:00 del 7" → "09:00 dell'8") e azzera `notified`.
 */
export function shiftRemindersForDate(reminders, toKey) {
  if (!reminders) return reminders;
  const [y, m, d] = toKey.split('-').map(Number);
  return reminders.map((r) => {
    const dt = new Date(r.at);
    if (Number.isNaN(dt.getTime())) return { ...r, notified: false };
    dt.setFullYear(y, (m || 1) - 1, d || 1);
    return { ...r, at: dt.toISOString(), notified: false };
  });
}

const FREQ_LABELS = {
  none: 'Nessuno',
  daily: 'Ogni giorno',
  weekdays: 'Ogni giorno (Lun–Ven)',
  weekly: 'Ogni settimana',
  monthly: 'Ogni mese',
};

export const REPEAT_FREQUENCIES = [
  { id: 'none', label: 'Nessuno' },
  { id: 'daily', label: 'Ogni giorno' },
  { id: 'weekdays', label: 'Giorni feriali (Lun–Ven)' },
  { id: 'weekly', label: 'Ogni settimana' },
  { id: 'monthly', label: 'Ogni mese' },
];

export const WEEKDAY_OPTIONS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mer' },
  { id: 4, label: 'Gio' },
  { id: 5, label: 'Ven' },
  { id: 6, label: 'Sab' },
  { id: 7, label: 'Dom' },
];

export function repeatLabel(repeat) {
  if (!repeat || !repeat.frequency || repeat.frequency === 'none') return 'Nessuno';
  let label = FREQ_LABELS[repeat.frequency] || 'Nessuno';
  if (repeat.frequency === 'weekly' && Array.isArray(repeat.weekdays) && repeat.weekdays.length > 0) {
    const days = repeat.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_OPTIONS.find((w) => w.id === d)?.label || '')
      .join(', ');
    label += ` · ${days}`;
  }
  if (repeat.endMode === 'after' && repeat.endAfter > 0) {
    label += ` · per ${repeat.endAfter} volte`;
  } else if (repeat.endMode === 'on' && repeat.endDate) {
    label += ` · fino al ${format(parseISO(repeat.endDate), 'd MMM yyyy', { locale: it })}`;
  }
  return label;
}

function occurrencesBetween(base, from, to, repeat) {
  const out = [];
  if (!repeat || !repeat.frequency || repeat.frequency === 'none') return out;
  const baseDate = parseISO(base);
  const freq = repeat.frequency;

  for (let d = from; d <= to; d = addDays(d, 1)) {
    const key = toDateKey(d);
    if (key === base) continue; // la data base è già salvata come evento separato

    let match = false;
    let occurrence = 1; // occorrenza #1 = data base

    if (freq === 'daily') {
      match = true;
      occurrence = differenceInCalendarDays(d, baseDate) + 1;
    } else if (freq === 'weekdays') {
      const wd = isoWeekday(d);
      match = wd >= 1 && wd <= 5;
      if (match) {
        occurrence = 1;
        for (let cursor = addDays(baseDate, 1); cursor <= d; cursor = addDays(cursor, 1)) {
          const cwd = isoWeekday(cursor);
          if (cwd >= 1 && cwd <= 5) occurrence++;
        }
      }
    } else if (freq === 'weekly') {
      const days = repeat.weekdays?.length ? repeat.weekdays : [isoWeekday(baseDate)];
      match = days.includes(isoWeekday(d));
      if (match) {
        const diff = differenceInCalendarDays(d, baseDate);
        // numero di date tra base (esclusa) e d che cadono nei giorni scelti
        occurrence = 1;
        for (let cursor = addDays(baseDate, 1); cursor <= d; cursor = addDays(cursor, 1)) {
          if (days.includes(isoWeekday(cursor))) occurrence++;
        }
        // se la data base non è uno dei giorni scelti, non conta come #1
        if (!days.includes(isoWeekday(baseDate))) occurrence = 0;
        void diff;
      }
    } else if (freq === 'monthly') {
      match = format(d, 'd') === format(baseDate, 'd');
      if (match) {
        occurrence = 1;
        let cursor = addMonths(baseDate, 1);
        while (cursor <= d) {
          occurrence++;
          cursor = addMonths(cursor, 1);
        }
      }
    }

    if (!match) continue;
    if (repeat.endMode === 'after' && repeat.endAfter > 0 && occurrence > repeat.endAfter) continue;
    if (repeat.endMode === 'on' && repeat.endDate && toDateKey(d) > repeat.endDate) continue;
    out.push(key);
  }
  return out;
}

/**
 * Identità "logica" di un'attività per il dedup: stesso titolo (normalizzato),
 * categoria e ora di inizio → considerata la stessa attività.
 * Serve per il requisito "giorni con un'attività normale e una duplicata →
 * si vede solo quella normale": l'occorrenza virtuale (espansa da una regola
 * di ripetizione) è nascosta quando sul giorno esiste già l'istanza reale.
 */
function identityKey(ev) {
  return [(ev.title || '').trim().toLowerCase(), (ev.category || '').trim().toLowerCase(), ev.startTime || ''].join('|');
}

/**
 * Restituisce l'elenco di eventi (con la loro data originale) che cadono nella
 * data richiesta, incluse le occorrenze ripetute.
 * eventi: array di task/eventi con { date?, startDate?, repeat? }
 */
export function expandEventsForDate(events, dateKey) {
  const target = parseISO(dateKey);
  // Istanze concrete (salvate nel DB) per la data: vincono sempre sulle occorrenze virtuali
  const concrete = (events || []).filter((ev) => ev.date === dateKey);
  const seenIds = new Set(concrete.map((ev) => ev._id));
  const seenSeries = new Set(concrete.map((ev) => ev.seriesId).filter(Boolean));
  const seenIdentity = new Set(concrete.map(identityKey));
  const out = [...concrete];
  for (const ev of events || []) {
    // Le istanze concrete della data sono già in `out`; qui restano solo le
    // occorrenze virtuali espanse dalle regole di ripetizione (task legacy).
    if (!ev._id || seenIds.has(ev._id)) continue;
    if (ev.materialized || !hasRepeatRule(ev.repeat)) continue;
    if (!occurrencesBetween(ev.date, target, target, ev.repeat).length) continue;
    // Duplicata → mostra solo l'istanza concreta ("normale") già presente
    if (seenSeries.has(ev._id) || seenIdentity.has(identityKey(ev))) continue;
    seenIds.add(ev._id);
    if (ev.seriesId) seenSeries.add(ev.seriesId);
    seenIdentity.add(identityKey(ev));
    out.push(ev);
  }
  return out;
}

/**
 * Espande gli eventi su un intervallo di date → Map<dateKey, eventi[]>.
 * Usato dalla griglia mensile (ogni giorno mostra le sue istanze).
 * Dedup: se su un giorno esistono sia l'attività "normale" (istanza reale)
 * sia la sua duplicata virtuale (occorrenza espansa), resta solo la normale.
 */
export function expandEventsForRange(events, startKey, endKey) {
  const map = new Map();
  const entry = (key) => {
    if (!map.has(key)) map.set(key, { items: [], ids: new Set(), series: new Set(), identity: new Set() });
    return map.get(key);
  };
  const push = (key, ev) => {
    const e = entry(key);
    if (ev._id && e.ids.has(ev._id)) return; // dedup per _id (sicurezza)
    if (ev._id) e.ids.add(ev._id);
    if (ev.seriesId) e.series.add(ev.seriesId);
    e.identity.add(identityKey(ev));
    e.items.push(ev);
  };
  const from = parseISO(startKey);
  const to = parseISO(endKey);
  if (from > to) return map;

  // 1) Istanze concrete sulla loro data
  for (const ev of events || []) {
    if (!ev.date) continue;
    if (ev.date >= startKey && ev.date <= endKey) push(ev.date, ev);
  }
  // 2) Occorrenze virtuali dei task legacy (con regola, non materializzati):
  //    nascoste se il giorno ha già l'istanza normale (stessa serie o stessa identità)
  for (const ev of events || []) {
    if (!ev.date || ev.materialized || !hasRepeatRule(ev.repeat)) continue;
    for (const key of occurrencesBetween(ev.date, from, to, ev.repeat)) {
      const e = entry(key);
      if (ev._id && (e.ids.has(ev._id) || e.series.has(ev._id))) continue;
      if (e.identity.has(identityKey(ev))) continue; // già c'è la "normale"
      push(key, ev);
    }
  }
  const out = new Map();
  for (const [key, e] of map) out.set(key, e.items);
  return out;
}

/** Range di date base necessario per coprire le occorrenze nel range richiesto. */
export function baseDateRange(startKey, endKey, repeat) {
  if (!repeat || !repeat.frequency || repeat.frequency === 'none') return { start: startKey, end: endKey };
  if (repeat.frequency === 'monthly') {
    // risali al massimo 24 mesi per coprire occorrenze mensili
    const d = parseISO(startKey);
    return { start: toDateKey(addMonths(d, -24)), end: endKey };
  }
  if (repeat.endMode === 'on' && repeat.endDate) {
    return { start: startKey, end: endKey };
  }
  const d = parseISO(startKey);
  const lookback = repeat.frequency === 'daily' ? 365 : repeat.frequency === 'weekdays' ? 365 : 730;
  return { start: toDateKey(addDays(d, -lookback)), end: endKey };
}
