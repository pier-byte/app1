import { motion } from 'framer-motion';
import {
  Check, BookOpen, PencilLine, FileText, Repeat, BookMarked, Copy, Presentation,
  MoreHorizontal, Paperclip, Bell, Clock, Target,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
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
 * TaskCard — card Liquid Glass (ui-references/sezione_compiti_liquid_glass):
 * superficie in vetro con bordo hairline, badge neon della categoria
 * (rounded-xl, tinta 15% + bordo 30%), titolo semibold e meta tenue;
 * checkbox rotonda con target touch 44×44px.
 * Badge studio: 🎯 quando il compito è pianificato per la giornata di studio
 * mostrata; indicazione tenue se è stato pianificato in un altro giorno.
 */
export default function TaskCard({ task, onToggle, onOpenMenu, dateKey }) {
  const Icon = categoryIcon(task.category);
  const color = task.categoryColor || '#2997ff';
  const hasRepeat = task.repeat && task.repeat.frequency && task.repeat.frequency !== 'none';
  const reminders = task.reminders?.length || 0;
  const attachments = task.attachments?.length || 0;
  const studiedHere = !!task.studyDate && task.studyDate === dateKey && task.date !== dateKey;
  const studiedElsewhere = !!task.studyDate && task.studyDate !== dateKey && task.date === dateKey;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => onOpenMenu(task, e)}
      className="liquid-glass liquid-specular relative rounded-2xl p-4 flex items-center gap-3.5 active:bg-white/[0.06] transition-colors cursor-pointer"
    >
      {/* Badge neon categoria (reference) */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{ backgroundColor: `${color}26`, borderColor: `${color}4d`, color }}
      >
        <Icon size={19} />
      </div>

      {/* Testi */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[14px] font-semibold tracking-tight text-label leading-snug truncate',
            task.completed && 'line-through text-label-tertiary font-medium'
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[12px] font-medium text-label-tertiary min-w-0">
          {!task.allDay && task.startTime && (
            <span className="flex items-center gap-1 text-label-secondary shrink-0">
              <Clock size={11} /> {task.startTime}
              {task.endTime ? `–${task.endTime}` : ''}
            </span>
          )}
          <span className="truncate">{task.allDay && !task.startTime ? 'Tutto il giorno' : task.category}</span>
          {task.estimatedMinutes ? <span className="shrink-0">· ~{formatMinutes(task.estimatedMinutes)}</span> : null}
          {task.actualMinutes ? (
            <span className="text-sys-green shrink-0">· {formatMinutes(task.actualMinutes)} fatte</span>
          ) : null}
          {hasRepeat && (
            <span className="flex items-center gap-1 shrink-0" title={repeatLabel(task.repeat)}>
              <Repeat size={11} />
            </span>
          )}
          {reminders > 0 && (
            <span className="flex items-center gap-1 shrink-0" title={`${reminders} promemoria`}>
              <Bell size={11} />
            </span>
          )}
          {attachments > 0 && (
            <span className="flex items-center gap-1 shrink-0" title={`${attachments} allegati`}>
              <Paperclip size={11} />
            </span>
          )}
          {studiedHere && (
            <span className="flex items-center gap-1 text-sky shrink-0" title="Pianificato per questa giornata di studio">
              <Target size={11} /> studio oggi
            </span>
          )}
          {studiedElsewhere && (
            <span className="shrink-0" title="Pianificato in un’altra giornata di studio">
              · studiato il {format(parseISO(task.studyDate), 'd MMM', { locale: it })}
            </span>
          )}
        </div>
      </div>

      {/* Checkbox rotonda con target touch 44px */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        aria-label={task.completed ? 'Segna come non completato' : 'Segna come completato'}
        className="w-11 h-11 grid place-items-center shrink-0 -mr-1.5"
      >
        <span
          className={cn(
            'w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-colors',
            task.completed ? 'bg-accent border-accent' : 'border-label-quaternary active:border-label-secondary'
          )}
        >
          {task.completed && <Check size={14} className="text-white" strokeWidth={3.5} />}
        </span>
      </button>
    </motion.div>
  );
}

export { categoryIcon, MoreHorizontal };
