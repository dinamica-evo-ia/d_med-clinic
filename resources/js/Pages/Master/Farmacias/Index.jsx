import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const STATUS = {
  new: { label: 'Novo', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  imported: { label: 'Importado', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Index({ submissions, filters, counts }) {
  const { flash } = usePage().props;
  const [search, setSearch] = useState(filters?.search || '');
  const [status, setStatus] = useState(filters?.status || '');
  const [open, setOpen] = useState(null);

  const apply = (over = {}) => router.get('/master/farmacias', {
    search: (over.search ?? search) || undefined,
    status: (over.status ?? status) || undefined,
  }, { preserveState: true, replace: true });

  const setImported = (s, val) => router.put(`/master/farmacias/${s.id}/status`, { status: val ? 'imported' : 'new' }, { preserveScroll: true });
  const remove = (s) => {
    if (confirm(`Remover o envio de "${s.lab_name}"? O arquivo será apagado do servidor.`)) {
      router.delete(`/master/farmacias/${s.id}`, { preserveScroll: true });
    }
  };

  return (
    <div className="space-y-6">
      {flash?.success && <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-200">{flash.success}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Farmácias Parceiras</h1>
          <p className="text-sm text-slate-400 mt-1">
            {counts?.total ?? submissions.length} envio(s)
            {counts?.new ? <span className="text-sky-300"> · {counts.new} novo(s)</span> : null}
            {' '}— via <span className="text-amber-300">dmedclinic.com.br/parceria-farmacias</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="Buscar laboratório / responsável / contato…" className="flex-1 min-w-[220px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="new">Novos</option>
          <option value="imported">Importados</option>
        </select>
        <button onClick={() => apply()} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Filtrar</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Laboratório</th>
              <th className="text-left px-3 py-3">Contato</th>
              <th className="text-left px-3 py-3">Arquivo</th>
              <th className="text-left px-3 py-3">Enviado</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 && (
              <tr><td colSpan="6" className="text-center py-12 text-slate-500">Nenhum envio ainda. Compartilhe o link da página de parceria com os laboratórios.</td></tr>
            )}
            {submissions.map((s) => {
              const st = STATUS[s.status] || STATUS.new;
              return (
                <tr key={s.id} className="border-t border-slate-700/40 hover:bg-slate-800/40 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{s.lab_name}</div>
                    <div className="text-xs text-slate-500">{s.responsible_name}</div>
                    {!s.authorized && <div className="text-[11px] text-rose-300 mt-0.5">sem autorização ⚠</div>}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-300">
                    {s.contact_email && <div><a href={`mailto:${s.contact_email}`} className="hover:text-amber-300">{s.contact_email}</a></div>}
                    {s.contact_phone && <div className="text-slate-400 mt-0.5">{s.contact_phone}</div>}
                    {!s.contact_email && !s.contact_phone && <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {s.has_file ? (
                      <a href={`/master/farmacias/${s.id}/download`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-500/25">
                        ↓ Baixar
                      </a>
                    ) : <span className="text-xs text-rose-300">arquivo ausente</span>}
                    <div className="text-[11px] text-slate-500 mt-1 max-w-[180px] truncate" title={s.file_name}>{s.file_name}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(s.created_at)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
                      {s.notes && <button onClick={() => setOpen(s)} className="text-slate-300 hover:text-amber-300">Ver obs.</button>}
                      {s.status === 'imported'
                        ? <button onClick={() => setImported(s, false)} className="text-slate-400 hover:text-sky-300">Marcar novo</button>
                        : <button onClick={() => setImported(s, true)} className="text-emerald-300 hover:text-emerald-200">Marcar importado</button>}
                      <button onClick={() => remove(s)} className="text-rose-300 hover:text-rose-200">Remover</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3 text-slate-100">
            <h2 className="text-lg font-bold">{open.lab_name}</h2>
            <p className="text-xs text-slate-400">Observações enviadas pelo laboratório:</p>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3 text-sm text-slate-200 whitespace-pre-wrap">{open.notes}</div>
            <div className="flex justify-end pt-1"><button onClick={() => setOpen(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
