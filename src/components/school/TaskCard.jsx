import { motion } from 'framer-motion';
import {
  Check, BookOpen, PencilLine, FileText, Repeat, BookMarked, Copy, Presentation,
  MoreHorizontal, Paperclip, Bell, Clock,
} from 'lucide-react';
import { formatMinutes } from '../../lib/dates';
import { repeatLabel } from '../../lib/repeat';
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
 * TaskCard — Riga compito stile screenshot 06/13: icona categoria colorata,
 * titolo, meta (orario, ripetizione, promemoria, allegati), checkbox rotonda.
 * Tap sulla card → menu contestuale (Modifica, Domani, Cambia data, Elimina).
 */
export default function TaskCard({ task, onToggle, onOpenMenu }) {
  const Icon = categoryIcon(task.category);
  const color = task.categoryColor || '#0a84ff';
  const hasRepeat = task.repeat && task.repeat.frequency && task.repeat.frequency !== 'none';
  const reminders = task.reminders?.length || 0;
  const attachments = task.attachments?.length || 0;

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
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[12px] text-label-tertiary">
          {!task.allDay && task.startTime && (
            <span className="flex items-center gap-1 text-label-secondary">
              <Clock size={11} /> {task.startTime}
              {task.endTime ? `–${task.endTime}` : ''}
            </span>
          )}
          <span>{task.category}</span>
          {task.estimatedMinutes ? <>· ~{formatMinutes(task.estimatedMinutes)}</> : null}
          {task.actualMinutes ? (
            <span className="text-sys-green font-medium">· {formatMinutes(task.actualMinutes)} fatte</span>
          ) : null}
          {hasRepeat && (
            <span className="flex items-center gap-1 text-label-tertiary" title={repeatLabel(task.repeat)}>
              <Repeat size={11} /> {repeatLabel(task.repeat)}
            </span>
          )}
          {reminders > 0 && (
            <span className="flex items-center gap-1 text-label-tertiary" title={`${reminders} promemoria`}>
              <Bell size={11} /> {reminders}
            </span>
          )}
          {attachments > 0 && (
            <span className="flex items-center gap-1 text-label-tertiary" title={`${attachments} allegati`}>
              <Paperclip size={11} /> {attachments}
            </span>
          )}
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
          'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.completed ? 'bg-accent border-accent' : 'border-label-quaternary active:border-label-secondary'
        )}
      >
        {task.completed && <Check size={15} className="text-white" strokeWidth={3.5} />}
      </button>
    </motion.div>
  );
}

export { categoryIcon, MoreHorizontal };
