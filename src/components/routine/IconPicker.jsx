import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { ROUTINE_ICONS, ROUTINE_ICONS_PRIMARY } from '../../lib/constants';
import RoutineIcon from './RoutineIcon';
import { cn } from '../../lib/cn';

/**
 * IconPicker — Selettore icone monocromatiche:
 * 5 icone principali in primo piano + pulsante "+N" che apre il modale
 * centrato (backdrop blur) con la libreria completa.
 */
export default function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const hidden = ROUTINE_ICONS.length - ROUTINE_ICONS_PRIMARY.length;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {ROUTINE_ICONS_PRIMARY.map((name) => {
          const active = value === name;
          return (
            <button
              key={name}
              onClick={() => onChange(name)}
              className={cn(
                'w-11 h-11 rounded-full bg-surface-2 grid place-items-center transition-colors',
                active && 'ring-2 ring-accent bg-surface-3'
              )}
              aria-label={`Icona ${name}`}
              aria-pressed={active}
            >
              <RoutineIcon icon={name} size={19} className={active ? 'text-label' : undefined} />
            </button>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="h-11 px-4 rounded-full bg-surface-2 text-label-secondary text-[14px] font-semibold active:bg-surface-3"
          aria-label={`Mostra tutte le ${ROUTINE_ICONS.length} icone`}
        >
          +{hidden}
        </button>
      </div>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Scegli un’icona"
        actions={
          <button onClick={() => setOpen(false)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Fine
          </button>
        }
      >
        <div className="grid grid-cols-5 gap-2 py-2">
          {ROUTINE_ICONS.map((name) => {
            const active = value === name;
            return (
              <button
                key={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  'aspect-square rounded-2xl bg-surface-2 grid place-items-center transition-colors active:bg-surface-3',
                  active && 'ring-2 ring-accent bg-surface-3'
                )}
                aria-label={`Icona ${name}`}
                aria-pressed={active}
              >
                <RoutineIcon icon={name} size={22} className={active ? 'text-label' : undefined} />
              </button>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
