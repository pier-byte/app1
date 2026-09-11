import { motion } from 'framer-motion';
import { CalendarDays, ListChecks, Dumbbell, UtensilsCrossed, StickyNote, Wallet } from 'lucide-react';
import { cn } from '../../lib/cn';

const tabs = [
  { id:'calendario', label:'Calendario', Icon:CalendarDays },
  { id:'scuola', label:'Compiti', Icon:ListChecks },
  { id:'routine', label:'Routine', Icon:Dumbbell },
  { id:'nutrizione', label:'Nutrizione', Icon:UtensilsCrossed },
  { id:'note', label:'Note', Icon:StickyNote },
  { id:'wallet', label:'Wallet', Icon:Wallet },
];

export default function BottomNav({activeTab,onTabChange}) {
  return (
    <nav className="flex items-end justify-around bg-surface-1/88 backdrop-blur-dialog border-t border-separator-opaque shrink-0"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 4px)', minHeight: 72 }}>
      {tabs.map(({id,label,Icon})=>{
        const active=activeTab===id;
        return (
          <button
            key={id}
            onClick={()=>onTabChange(id)}
            className={cn('flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1 min-w-0 relative', active ? 'text-accent' : 'text-label-tertiary')}
            style={{ minHeight: 52 }}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              {active && <motion.i layoutId="nav" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />}
            </div>
            <span className="text-[8.5px] sm:text-[10px] leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
