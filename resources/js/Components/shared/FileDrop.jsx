import { useState, useRef } from 'react';

const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * Área de arrastar-e-soltar + botão de escolher arquivo. Devolve a lista pelo onChange.
 * Usado nos resultados de exame (laudos em PDF/imagem).
 */
export default function FileDrop({ files = [], onChange, max = 10, accept }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const somar = (novos) => {
    const lista = [...files, ...Array.from(novos)].slice(0, max);
    onChange(lista);
  };

  const drop = (e) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files?.length) somar(e.dataTransfer.files);
  };

  const remover = (i) => onChange(files.filter((_, x) => x !== i));

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          over ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <svg className="mx-auto mb-2 h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 15v3a2 2 0 002 2h14a2 2 0 002-2v-3" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium text-slate-700">
          Arraste os arquivos aqui
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          ou <span className="font-medium text-blue-600">clique para selecionar</span> · PDF, imagem, até 10 MB cada
        </p>
        <input ref={inputRef} type="file" multiple accept={accept} className="hidden"
          onChange={(e) => { somar(e.target.files); e.target.value = ''; }} />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{f.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{fmtSize(f.size)}</span>
              <button type="button" onClick={() => remover(i)}
                className="shrink-0 text-xs font-medium text-rose-500 hover:text-rose-700">
                remover
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length >= max && (
        <p className="mt-1 text-xs text-amber-600">Máximo de {max} arquivos por resultado.</p>
      )}
    </div>
  );
}
