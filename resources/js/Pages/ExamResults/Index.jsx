import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import ExamTabs from './Partials/ExamTabs';

export default function Index({ results, filters }) {
  const [busca, setBusca] = useState(filters?.search || '');

  const buscar = (e) => {
    e.preventDefault();
    router.get('/exam-results', busca ? { search: busca } : {}, { preserveState: true });
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exames</h1>
          <p className="mt-1 text-sm text-slate-500">Resultados que voltaram do laboratório.</p>
        </div>
        <Link href="/exam-results/create"
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          + Novo resultado
        </Link>
      </div>

      <ExamTabs active="resultados" />

      <form onSubmit={buscar} className="mb-4">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
          placeholder="Buscar por título ou paciente…" />
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* overflow-x: em tela estreita a tabela rola sozinha em vez de estourar a página */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Título</Th><Th>Paciente</Th><Th>Data</Th><Th>Anexos</Th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.data.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Nenhum resultado guardado ainda.
                </td></tr>
              )}
              {results.data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{r.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{r.patient}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{r.result_date || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    {r.anexos > 0
                      ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">📎 {r.anexos}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/exam-results/${r.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {results.links && results.data.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
            <span className="text-sm text-slate-500">
              {results.from || 0}–{results.to || 0} de {results.total || 0}
            </span>
            <div className="flex gap-1">
              {results.links.map((l, i) => (
                <Link key={i} href={l.url || '#'}
                  className={`rounded px-3 py-1 text-sm ${l.active ? 'bg-blue-600 text-white' : l.url ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'}`}
                  dangerouslySetInnerHTML={{ __html: l.label }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">{children}</th>;
}
