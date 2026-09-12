import { motion } from 'framer-motion';
import { CalendarDays, ListChecks, Dumbbell, UtensilsCrossed, CircleUserRound } from 'lucide-react';
import { cn } from '../../lib/cn';

const tabs = [
  { id:'calendario', label:'Calendario', Icon:CalendarDays },
  { id:'scuola', label:'Compiti', Icon:ListChecks },
  { id:'routine', label:'Routine', Icon:Dumbbell },
  { id:'nutrizione', label:'Nutrizione', Icon:UtensilsCrossed },
  { id:'profilo', label:'Profilo', Icon:CircleUserRound },
];

/**
 * BottomNav — "global-nav" (DESIGN.md): barra nera pura frosted (saturate 180%
 * blur 20px) con hairline superiore; voce attiva in Sky Link Blue (#2997ff,
 * il blu dei link su superfici scure), voci inattive grigio silenzioso.
 */
export default function BottomNav({activeTab,onTabChange}) {
  return (
    <nav
      className="flex items-end justify-around bg-void/80 backdrop-blur-dialog border-t border-white/[0.08] shrink-0"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 6px)',
        minHeight: 78,
        '--bottom-nav-h': '78px',
      }}
    >
      {tabs.map(({id,label,Icon})=>{
        const active=activeTab===id;
        return (
          <button
            key={id}
            onClick={()=>onTabChange(id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-1 min-w-0 relative transition-colors',
              active ? 'text-sky' : 'text-[#8e8e93]'
            )}
            style={{ minHeight: 54 }}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              {active && <motion.i layoutId="nav" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky" />}
            </div>
            <span className="text-[10px] leading-none tracking-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
