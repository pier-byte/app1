import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { addMonths, subMonths } from 'date-fns';
import { useAuth } from './hooks/useAuth';
import PinScreen from './components/auth/PinScreen';
import AppShell from './components/layout/AppShell';
import BottomNav from './components/layout/BottomNav';
import { useDateNavigation } from './hooks/useDateNavigation';
import CalendarPage from './pages/CalendarPage';
import SchoolPage from './pages/SchoolPage';
import RoutinePage from './pages/RoutinePage';
import NutritionPage from './pages/NutritionPage';
import NotesPage from './pages/NotesPage';
import WalletPage from './pages/WalletPage';
import { startReminderEngine, notify, showInAppToast } from './lib/notifications';
import { useExpandedTasks, useTasks } from './hooks/useData';
import { toDateKey } from './lib/dates';

export default function App() {
  const { isAuthenticated, authenticate, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('calendario');
  const [calendarMode, setCalendarModeState] = useState(() => localStorage.getItem('app1_calendar_mode') || 'month');
  const nav = useDateNavigation();
  const setCalendarMode = (mode) => {
    setCalendarModeState(mode);
    localStorage.setItem('app1_calendar_mode', mode);
  };

  const renderPage = useCallback(() => {
    const pageProps = { selectedDate: nav.selectedDate, weekDates: nav.weekDates, weekLabel: nav.weekLabel, goToPrevWeek: nav.goToPrevWeek, goToNextWeek: nav.goToNextWeek, goToToday: nav.goToToday, onSelectDate: nav.selectDate };
    if (activeTab === 'calendario') return <CalendarPage key="calendario" {...nav} mode={calendarMode} setMode={setCalendarMode} goPrev={() => nav.selectDate(subMonths(nav.selectedDate, 1))} goNext={() => nav.selectDate(addMonths(nav.selectedDate, 1))} onOpenTasks={() => setActiveTab('scuola')} />;
    if (activeTab === 'scuola') return <SchoolPage key="scuola" {...pageProps} />;
    if (activeTab === 'routine') return <RoutinePage key="routine" {...pageProps} />;
    if (activeTab === 'nutrizione') return <NutritionPage key="nutrizione" {...pageProps} />;
    if (activeTab === 'note') return <NotesPage key="note" />;
    if (activeTab === 'wallet') return <WalletPage key="wallet" {...pageProps} />;
    return null;
  }, [activeTab, nav.selectedDate, nav.weekDates, nav.weekLabel, nav.goToPrevWeek, nav.goToNextWeek, nav.goToToday, nav.selectDate, calendarMode]);

  // Motore promemoria: controlla le notifiche non ancora mostrate anche
  // quando si cambia tab (l'app deve essere installata per le notifiche iOS).
  const todayKey = toDateKey(new Date());
  const { data: todayTasks } = useExpandedTasks(todayKey);
  const { updateTask } = useTasks(todayKey);
  useEffect(() => {
    if (!isAuthenticated) return;
    const stop = startReminderEngine(() => {
      const now = Date.now();
      (todayTasks ?? []).forEach((task) => {
        const due = (task.reminders || []).filter((rem) => !rem.notified && new Date(rem.at).getTime() <= now);
        if (!due.length) return;
        if (!task.completed) {
          due.forEach((rem) => {
            notify({ title: task.title, body: rem.label });
            showInAppToast(task.title, rem.label);
          });
        }
        // segna come notificati per non ripetere
        updateTask(task._id, {
          reminders: (task.reminders || []).map((rem) =>
            due.some((d) => d.at === rem.at) ? { ...rem, notified: true } : rem
          ),
        });
      });
    });
    return stop;
  }, [isAuthenticated, todayTasks, updateTask]);

  if (authLoading) return <div className="flex items-center justify-center h-full bg-canvas"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <PinScreen onAuthenticate={authenticate} />;
  return <AppShell><div className="flex-1 overflow-hidden"><AnimatePresence mode="wait">{renderPage()}</AnimatePresence></div><ToastHost /><BottomNav activeTab={activeTab} onTabChange={setActiveTab} /></AppShell>;
}

/** Banner in-app per i promemoria (oltre alla notifica di sistema). */
function ToastHost() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      setToast(e.detail);
      setTimeout(() => setToast((t) => (t?.at === e.detail.at ? null : t)), 6000);
    };
    window.addEventListener('app1-toast', handler);
    return () => window.removeEventListener('app1-toast', handler);
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <div className="fixed left-4 right-4 z-[60] rounded-2xl bg-surface-dialog backdrop-blur-dialog p-4 shadow-2xl border border-separator"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 8px))' }}>
          <p className="text-[13px] text-accent font-semibold mb-0.5">🔔 Promemoria</p>
          <p className="text-[14px] text-label font-medium">{toast.title}</p>
          <p className="text-[12px] text-label-secondary">{toast.body}</p>
        </div>
      )}
    </AnimatePresence>
  );
}
