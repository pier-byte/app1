import { useRef, useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, File, X, Download } from 'lucide-react';
import { cn } from '../../lib/cn';

const MAX_INLINE = 1_500_000; // ~1.5 MB per evitare overflow localStorage

function fileToAttachment(file) {
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl: undefined,
  };
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function iconFor(type) {
  if (type?.startsWith('image/')) return ImageIcon;
  if (type?.includes('pdf') || type?.includes('word') || type?.includes('text')) return FileText;
  return File;
}

/**
 * AttachmentList — "Allegato" (screenshot 12): aggiungi file da foto, documenti,
 * PDF… I file piccoli vengono incorporati in base64 (persistono in demo mode),
 * quelli più grandi restano come riferimento e si aprono solo dalla sessione.
 */
export default function AttachmentList({ attachments = [], onChange }) {
  const inputRef = useRef(null);
  const [warning, setWarning] = useState(null);

  const addFiles = async (files) => {
    const added = [];
    let warned = false;
    for (const file of Array.from(files || [])) {
      const att = fileToAttachment(file);
      if (file.size <= MAX_INLINE) {
        try {
          att.dataUrl = await readAsDataUrl(file);
        } catch {
          warned = true;
        }
      } else {
        warned = true;
      }
      added.push(att);
    }
    onChange([...(attachments || []), ...added]);
    setWarning(warned ? 'Alcuni file sono stati aggiunti solo come riferimento (troppo grandi per essere salvati).' : null);
  };

  const open = (att) => {
    if (att.dataUrl) {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    setWarning(`"${att.name}" è disponibile solo come riferimento: aggiungi di nuovo il file in questa sessione per aprirlo.`);
  };

  return (
    <div className="w-full border-b border-separator">
      <div className="flex items-center gap-3 px-1 py-3.5">
        <Paperclip size={20} className="text-label-secondary shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[16px] text-label">Allegato</p>
          {attachments.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1.5">
              {attachments.map((att, i) => {
                const Icon = iconFor(att.type);
                return (
                  <div key={i} className="flex items-center gap-2 pl-1">
                    <button
                      onClick={() => open(att)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <Icon size={15} className="text-accent shrink-0" />
                      <span className="text-[13px] text-label-secondary truncate">{att.name}</span>
                      <Download size={12} className="text-label-tertiary shrink-0" />
                    </button>
                    <button
                      onClick={() => onChange(attachments.filter((_, j) => j !== i))}
                      className="w-9 h-9 grid place-items-center text-label-tertiary active:text-sys-red"
                      aria-label="Rimuovi allegato"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button onClick={() => inputRef.current?.click()} className="text-[14px] font-semibold text-accent min-h-10">
          Aggiungi
        </button>
      </div>
      {warning && <p className={cn('text-[12px] text-sys-orange px-1 pb-3 leading-snug')}>{warning}</p>}
    </div>
  );
}
