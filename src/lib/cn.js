/**
 * Utility per combinare classNames condizionali.
 * Filtra valori falsy e unisce con spazio.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
