import { useState } from 'react';
import { Bell, BellOff, Plus, X } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { REMINDER_OPTIONS, requestNotificationPermission, reminderDateTime } from '../../lib/notifications';
import { cn } from '../../lib/cn';

/**
 * ReminderPicker — "Promemoria" (screenshot 12): aggiungi/scarica promemoria
 * con prefissi (all'ora, 5/15/30 min prima, 1h/2h, giorno alle 09:00).
 * Chiede il permesso notifiche (necessario su iOS/Android PWA).
 */
export default function ReminderPicker({ reminders = [], date, time, allDay, onChange }) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const add = async (option) => {
    const at = reminderDateTime(date, allDay ? '09:00' : time, option.offsetMinutes);
    onChange([
      ...reminders,
      { at: at.toISOString(), label: option.label, offsetKey: option.id, notified: false },
    ]);
    setOpen(false);
  };

  const ask = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') alert('Notifiche attive! Riceverai i promemoria quando l’app è aperta.');
  };

  return (
    <div className="border-b border-separator">
      <div className="w-full flex items-center gap-3 px-1 py-3.5">
        <Bell size={20} className="text-label-secondary shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[16px] text-label">Promemoria</p>
          {reminders.length > 0 ? (
            <div className="flex flex-col gap-1 mt-1.5">
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center gap-2 pl-1">
                  <span className="text-[13px] text-label-tertiary">⏰</span>
                  <span className="text-[13px] text-label-secondary flex-1">{r.label}</span>
                  <button
                    onClick={() => onChange(reminders.filter((_, j) => j !== i))}
                    className="w-9 h-9 grid place-items-center text-label-tertiary active:text-sys-red"
                    aria-label="Rimuovi promemoria"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-[14px] font-semibold text-accent min-h-10 flex items-center gap-1"
        >
          <Plus size={14} /> Aggiungi
        </button>
      </div>

      {(permission === 'default' || permission === 'denied') && (
        <button
          onClick={ask}
          className="ml-1 mb-3 flex items-center gap-2 px-1 text-left"
        >
          <BellOff size={13} className="text-sys-orange shrink-0" />
          <span className="text-[12px] text-sys-orange leading-snug">
            {permission === 'denied'
              ? 'Notifiche bloccate: abilitalo dalle impostazioni del browser per i promemoria.'
              : 'Consenti le notifiche per ricevere i promemoria.'}
          </span>
        </button>
      )}

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Promemoria"
        actions={
          <button onClick={() => setOpen(false)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Annulla
          </button>
        }
      >
        <div className="py-1">
          {REMINDER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => add(opt)}
              className="w-full flex items-center gap-3 py-3 text-left active:opacity-70"
            >
              <Bell size={17} className="text-label-tertiary shrink-0" />
              <span className="text-[15px] text-label flex-1">{opt.label}</span>
              <span className="text-[13px] text-label-tertiary tabular-nums">
                {opt.offsetMinutes ? `−${opt.offsetMinutes} min` : ''}
              </span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
