import { useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';

export default function Index({ formulas, filters, total, counts }) {
  const { flash } = usePage().props;
  const [search, setSearch] = useState(filters?.search || '');
  const [editing, setEditing] = useState(null); // null=fechado | {}=nova | {id,...}=editar
  const [copiedId, setCopiedId] = useState(null);
  const cat = filters?.category || '';

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => router.get('/formulas', { search: search || undefined, category: cat || undefined }, { preserveState: true, replace: true, preserveScroll: true }), 350);
    return () => clearTimeout(t);
  }, [search]);

  const goCat = (k) => router.get('/formulas', { search: search || undefined, category: k || undefined }, { preserveState: true, replace: true, preserveScroll: true });

  const rows = formulas.data || [];
  const copy = (f) => { navigator.clipboard?.writeText(f.content || ''); setCopiedId(f.id); setTimeout(() => setCopiedId(null), 1500); };
  const remove = (f) => { if (confirm('Remover esta fórmula da biblioteca?')) router.delete(`/formulas/${f.id}`, { preserveScroll: true }); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manipulados e Industrializados</h1>
          <p className="text-sm text-slate-500">Biblioteca de fórmulas — busque, copie e use nas receitas. {total} no total.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/account/settings/import-export/formulas" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Importar CSV</a>
          <button onClick={() => setEditing({})} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">+ Nova fórmula</button>
        </div>
      </div>

      {flash?.success && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{flash.success}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, ativo, forma…" className={`${field} pl-10`} />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {[['', 'Todas'], ['manipulado', `Manipulados${counts ? ` (${counts.manipulado})` : ''}`], ['industrializado', `Industrializados${counts ? ` (${counts.industrializado})` : ''}`]].map(([k, label]) => (
            <button key={k} onClick={() => goCat(k)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${cat === k ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">Nenhuma fórmula encontrada. Clique em "+ Nova fórmula" para começar.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">{f.purpose || f.name}</h3>
                  {f.purpose && <p className="text-[11px] text-slate-400 truncate">{f.name}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {f.category === 'industrializado' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">Industr.</span>}
                  {f.form && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{f.form}</span>}
                  {f.route && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{f.route}</span>}
                </div>
              </div>
              <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap font-sans line-clamp-5 flex-1">{f.content}</pre>
              <div className="mt-3 flex items-center gap-3 text-xs border-t border-slate-100 pt-2">
                <button onClick={() => copy(f)} className="font-semibold text-blue-600 hover:text-blue-700">{copiedId === f.id ? 'Copiado!' : 'Copiar'}</button>
                <button onClick={() => setEditing(f)} className="text-slate-500 hover:text-slate-800">Editar</button>
                <button onClick={() => remove(f)} className="text-red-600 hover:text-red-700 ml-auto">Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formulas.links && rows.length > 0 && (
        <div className="flex justify-center gap-1 flex-wrap">
          {formulas.links.map((l, i) => (
            <button key={i} disabled={!l.url} onClick={() => l.url && router.get(l.url, {}, { preserveState: true, preserveScroll: true })}
              className={`px-3 py-1 text-sm rounded ${l.active ? 'bg-blue-600 text-white' : l.url ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 cursor-default'}`}
              dangerouslySetInnerHTML={{ __html: l.label }} />
          ))}
        </div>
      )}

      {editing && <FormulaModal formula={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FormulaModal({ formula, onClose }) {
  const isEdit = !!formula.id;
  const frm = useForm({
    purpose: formula.purpose || '',
    name: formula.name || '',
    content: formula.content || '',
    form: formula.form || '',
    route: formula.route || '',
    category: formula.category || 'manipulado',
  });
  const submit = (e) => {
    e.preventDefault();
    const opts = { preserveScroll: true, onSuccess: onClose };
    if (isEdit) frm.put(`/formulas/${formula.id}`, opts);
    else frm.post('/formulas', opts);
  };
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar fórmula' : 'Nova fórmula'}</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {[['manipulado', 'Manipulado'], ['industrializado', 'Industrializado']].map(([k, l]) => (
              <button type="button" key={k} onClick={() => frm.setData('category', k)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${frm.data.category === k ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Finalidade <span className="text-slate-400 font-normal">(para que serve)</span></label>
          <input value={frm.data.purpose} onChange={(e) => frm.setData('purpose', e.target.value)} className={field} placeholder="Ex.: Antienvelhecimento facial / Emagrecimento" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome / ativos</label>
          <input value={frm.data.name} onChange={(e) => frm.setData('name', e.target.value)} className={field} placeholder="Ex.: Minoxidil 5% + Finasterida 0,1%" />
          {frm.errors.name && <p className="text-xs text-red-600 mt-1">{frm.errors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Forma</label>
            <input value={frm.data.form} onChange={(e) => frm.setData('form', e.target.value)} className={field} placeholder="Cápsula, Creme…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Via de uso</label>
            <input value={frm.data.route} onChange={(e) => frm.setData('route', e.target.value)} className={field} placeholder="Oral, Externo…" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Conteúdo (composição + posologia)</label>
          <textarea rows={9} value={frm.data.content} onChange={(e) => frm.setData('content', e.target.value)} className={`${field} font-mono text-xs`}
            placeholder={'Ativo 1 ......... X mg\nAtivo 2 ......... Y %\n\nMande: 30 cápsulas\nPosologia: Tomar 1 ao dia'} />
          {frm.errors.content && <p className="text-xs text-red-600 mt-1">{frm.errors.content}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button type="submit" disabled={frm.processing} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">{frm.processing ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}
