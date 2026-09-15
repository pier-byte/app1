import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
  parseISO,
  eachDayOfInterval,
  getDay,
} from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Formatta una data in formato "YYYY-MM-DD" per uso come chiave DB
 */
export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Chiave del giorno corrente nell'orologio LOCALE del dispositivo
 * (nessuna conversione UTC: usa direttamente getFullYear/getMonth/getDate).
 */
export function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Data "oggi" locale (mezzanotte locale), coerente con todayKey(). */
export function getToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * Restituisce le 7 date della settimana (lun-dom)
 * contenente la data passata
 */
export function getWeekDates(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lunedì
  return eachDayOfInterval({
    start,
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });
}

/**
 * Formatta l'etichetta della settimana, es: "10 set - 16 set"
 */
export function getWeekLabel(weekDates) {
  const start = weekDates[0];
  const end = weekDates[6];
  const startStr = format(start, 'd MMM', { locale: it });
  const endStr = format(end, 'd MMM', { locale: it });
  return `${startStr} - ${endStr}`;
}

/**
 * Formatta il nome breve del giorno, es: "lun"
 */
export function getDayName(date) {
  return format(date, 'EEE', { locale: it });
}

/**
 * Restituisce il numero del giorno, es: "10"
 */
export function getDayNumber(date) {
  return format(date, 'd');
}

/**
 * Verifica se una data è oggi
 */
export { isToday, isSameDay, parseISO, addDays, subDays };

/**
 * Formatta una data per la visualizzazione, es: "Domani 4 set"
 */
export function formatDateDisplay(date) {
  const today = new Date();
  if (isSameDay(date, today)) return 'Oggi';
  if (isSameDay(date, addDays(today, 1))) return `Domani ${format(date, 'd MMM', { locale: it })}`;
  if (isSameDay(date, subDays(today, 1))) return `Ieri ${format(date, 'd MMM', { locale: it })}`;
  return format(date, 'EEEE d MMM', { locale: it });
}

/**
 * Formatta minuti in formato "Xh Ym"
 */
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Formatta secondi in "MM:SS"
 */
export function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Restituisce il lunedì della settimana per una data
 */
export function getMonday(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}
