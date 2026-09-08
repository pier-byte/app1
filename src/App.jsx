import { useState, useCallback } from 'react';
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
import WalletPage from './pages/WalletPage';

export default function App() {
  const { isAuthenticated, authenticate, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('calendario');
  const [calendarMode, setCalendarModeState] = useState(() => localStorage.getItem('app1_calendar_mode') || 'month');
  const nav = useDateNavigation();
  const setCalendarMode = (mode) => { setCalendarModeState(mode); localStorage.setItem('app1_calendar_mode', mode); };

  const renderPage = useCallback(() => {
    const pageProps = { selectedDate: nav.selectedDate, weekDates: nav.weekDates };
    if (activeTab === 'calendario') return <CalendarPage key="calendario" {...nav} mode={calendarMode} setMode={setCalendarMode} goPrev={() => nav.selectDate(subMonths(nav.selectedDate,1))} goNext={() => nav.selectDate(addMonths(nav.selectedDate,1))} onOpenTasks={() => setActiveTab('scuola')} />;
    if (activeTab === 'scuola') return <SchoolPage key="scuola" {...pageProps} />;
    if (activeTab === 'routine') return <RoutinePage key="routine" {...pageProps} />;
    if (activeTab === 'nutrizione') return <NutritionPage key="nutrizione" {...pageProps} />;
    if (activeTab === 'wallet') return <WalletPage key="wallet" {...pageProps} />;
    return null;
  }, [activeTab, nav.selectedDate, nav.weekDates, nav.weekLabel, calendarMode]);

  if (authLoading) return <div className="flex items-center justify-center h-full bg-canvas"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <PinScreen onAuthenticate={authenticate} />;
  return <AppShell><div className="flex-1 overflow-hidden"><AnimatePresence mode="wait">{renderPage()}</AnimatePresence></div><BottomNav activeTab={activeTab} onTabChange={setActiveTab} /></AppShell>;
}
