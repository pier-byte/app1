import { motion } from 'framer-motion';
import { Check, BookOpen, PencilLine, FileText, Repeat, BookMarked, Copy, Presentation, MoreHorizontal } from 'lucide-react';
import { formatMinutes } from '../../lib/dates';
import { cn } from '../../lib/cn';

const CATEGORY_ICONS = [
  { match: /studiar|studio/i, Icon: BookOpen },
  { match: /esercizi/i, Icon: PencilLine },
  { match: /verifica|interrogazione/i, Icon: FileText },
  { match: /ripeter/i, Icon: Repeat },
  { match: /leggere/i, Icon: BookMarked },
  { match: /ricopiar/i, Icon: Copy },
  { match: /ricerche|presentazioni/i, Icon: Presentation },
];

function categoryIcon(name) {
  const found = CATEGORY_ICONS.find((c) => c.match.test(name || ''));
  return found ? found.Icon : BookOpen;
}

/**
 * TaskCard — Riga compito stile screenshot 06/13:
 * icona categoria colorata, titolo, meta, checkbox rotonda.
 * Tap sulla card → menu contestuale (Modifica, Sposta a domani, Cambia data, Elimina).
 */
export default function TaskCard({ task, onToggle, onOpenMenu }) {
  const Icon = categoryIcon(task.category);
  const color = task.categoryColor || '#0a84ff';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => onOpenMenu(task, e)}
      className="bg-surface-1 rounded-xl p-3.5 flex items-center gap-3 active:bg-surface-2 transition-colors cursor-pointer"
    >
      {/* Icona categoria colorata */}
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={20} style={{ color }} />
      </div>

      {/* Testi */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[15px] font-medium text-label leading-snug',
            task.completed && 'line-through text-label-tertiary'
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[12px] text-label-tertiary">{task.category}</span>
          {task.estimatedMinutes ? (
            <>
              <span className="text-[12px] text-label-tertiary">·</span>
              <span className="text-[12px] text-label-tertiary">~{formatMinutes(task.estimatedMinutes)}</span>
            </>
          ) : null}
          {task.actualMinutes ? (
            <span className="text-[12px] text-sys-green font-medium">· {formatMinutes(task.actualMinutes)} fatte</span>
          ) : null}
        </div>
      </div>

      {/* Checkbox rotonda */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        aria-label={task.completed ? 'Segna come non completato' : 'Segna come completato'}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.completed ? 'bg-accent border-accent' : 'border-label-quaternary active:border-label-secondary'
        )}
      >
        {task.completed && <Check size={14} className="text-white" strokeWidth={3.5} />}
      </button>
    </motion.div>
  );
}

export { categoryIcon };
