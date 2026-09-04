import { motion } from 'framer-motion';
import { BookOpen, Dumbbell, UtensilsCrossed, Wallet } from 'lucide-react';
import { cn } from '../../lib/cn';

const tabs = [
  { id: 'scuola', label: 'Scuola', Icon: BookOpen },
  { id: 'routine', label: 'Routine', Icon: Dumbbell },
  { id: 'nutrizione', label: 'Nutrizione', Icon: UtensilsCrossed },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
];

/**
 * BottomNav — Navigazione inferiore stile iOS a 4 tab.
 * Tab attivo con indicatore animato blu e label evidenziata.
 */
export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      className="flex items-end justify-around bg-surface-1/80 backdrop-blur-dialog border-t border-separator-opaque"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 4px)',
        minHeight: '72px',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[64px] relative transition-colors',
              isActive ? 'text-accent' : 'text-label-tertiary'
            )}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </div>
            <span className={cn(
              'text-[10px] leading-tight',
              isActive ? 'font-semibold' : 'font-normal'
            )}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
