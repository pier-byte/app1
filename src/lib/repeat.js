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
 * Restituisce l'elenco di eventi (con la loro data originale) che cadono nella
 * data richiesta, incluse le occorrenze ripetute.
 * eventi: array di task/eventi con { date?, startDate?, repeat? }
 */
export function expandEventsForDate(events, dateKey) {
  const target = parseISO(dateKey);
  return (events || []).filter((ev) => {
    if (!ev.date) return false;
    if (ev.date === dateKey) return true;
    const hasRepeat = ev.repeat && ev.repeat.frequency && ev.repeat.frequency !== 'none';
    if (!hasRepeat) return false;
    return occurrencesBetween(ev.date, target, target, ev.repeat).length > 0;
  });
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
