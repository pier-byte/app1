import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import PinScreen from './components/auth/PinScreen';
import AppShell from './components/layout/AppShell';
import BottomNav from './components/layout/BottomNav';
import WeekStrip from './components/layout/WeekStrip';
import { useDateNavigation } from './hooks/useDateNavigation';
import SchoolPage from './pages/SchoolPage';
import RoutinePage from './pages/RoutinePage';
import NutritionPage from './pages/NutritionPage';
import WalletPage from './pages/WalletPage';

const TABS = ['scuola', 'routine', 'nutrizione', 'wallet'];

export default function App() {
  const { isAuthenticated, authenticate, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('scuola');
  const {
    selectedDate,
    weekDates,
    weekLabel,
    selectDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  } = useDateNavigation();

  const renderPage = useCallback(() => {
    const pageProps = { selectedDate, weekDates };
    switch (activeTab) {
      case 'scuola':
        return <SchoolPage key="scuola" {...pageProps} />;
      case 'routine':
        return <RoutinePage key="routine" {...pageProps} />;
      case 'nutrizione':
        return <NutritionPage key="nutrizione" {...pageProps} />;
      case 'wallet':
        return <WalletPage key="wallet" {...pageProps} />;
      default:
        return null;
    }
  }, [activeTab, selectedDate, weekDates]);

  // Schermata di caricamento
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Gate autenticazione PIN
  if (!isAuthenticated) {
    return <PinScreen onAuthenticate={authenticate} />;
  }

  return (
    <AppShell>
      {/* Header con navigazione settimanale */}
      <WeekStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        weekLabel={weekLabel}
        onSelectDate={selectDate}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
      />

      {/* Contenuto tab attivo */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </div>

      {/* Navigazione inferiore */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </AppShell>
  );
}
