import { useState, useCallback, useMemo } from 'react';
import { getWeekDates, getWeekLabel, addDays, subDays } from '../lib/dates';

/**
 * Hook per navigazione data e settimana.
 * Gestisce giorno selezionato, navigazione avanti/indietro settimana, "Oggi".
 */
export function useDateNavigation() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);

  const selectDate = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => subDays(prev, 7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 7));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
    selectedDate,
    weekDates,
    weekLabel,
    selectDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  };
}
