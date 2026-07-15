import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import FileDrop from '@/Components/shared/FileDrop';
import ExamTabs from './Partials/ExamTabs';

const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const icone = (mime) => (mime?.startsWith('image/') ? '🖼️' : mime?.includes('pdf') ? '📄' : '📎');

export default function Show({ result }) {
  const { flash } = usePage().props;
  const [novos, setNovos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const anexar = () => {
    if (!novos.length) return;
    setEnviando(true);
    router.post(`/exam-results/${result.id}/files`, { files: novos }, {
      forceFormData: true,
      onSuccess: () => setNovos([]),
      onFinish: () => setEnviando(false),
    });
  };

  const remover = () => {
    if (confirm('Remover este resultado e os arquivos dele?')) {
      router.delete(`/exam-results/${result.id}`);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{result.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/patients/${result.patient.id}`} className="font-medium text-blue-600 hover:text-blue-800">
              {result.patient.name}
            </Link>
            {result.doctor ? ` · ${result.doctor}` : ''}
            {result.result_date ? ` · ${new Date(result.result_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
          </p>
        </div>
        <button onClick={remover} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
          Remover
        </button>
      </div>

      <ExamTabs active="resultados" />

      {flash?.success && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {flash.success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Descrição</h2>
          {result.description
            ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{result.description}</p>
            : <p className="text-sm text-slate-400">Sem descrição.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Arquivos ({result.attachments.length})
          </h2>

          {result.attachments.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {result.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span>{icone(a.mime)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{a.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtSize(a.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <FileDrop files={novos} onChange={setNovos} max={10} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          {novos.length > 0 && (
            <button onClick={anexar} disabled={enviando}
              className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {enviando ? 'Enviando…' : `Anexar ${novos.length} arquivo(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
