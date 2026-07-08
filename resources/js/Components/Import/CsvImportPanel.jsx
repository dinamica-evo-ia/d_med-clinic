import { Link } from '@inertiajs/react';
import { useState } from 'react';

/*
 * Painel genérico de import CSV (form → preview → confirmar), reaproveitado por todos os
 * tópicos do hub "Importar & Exportar". Cada página só define colunas/dicas/rotas; o fluxo
 * de upload + pré-visualização + confirmação é o mesmo em todos.
 * Tanto preview quanto confirmar usam window.axios (XHR) — o controller responde JSON.
 */
export default function CsvImportPanel({
  backHref, backLabel, title, existing, existingLabel,
  previewUrl, storeUrl, columns, hints, confirmLabel, warnings,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const doPreview = async (f) => {
    setLoading(true); setPreview(null); setResult(null);
    const fd = new FormData(); fd.append('file', f);
    try {
      const { data } = await window.axios.post(previewUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
    } catch (e) {
      alert('Erro ao pré-visualizar: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0]; setFile(f);
    if (f) doPreview(f);
  };

  const confirm = async (e) => {
    e.preventDefault();
    if (!file || importing) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await window.axios.post(storeUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
      setFile(null); setPreview(null);
      const input = document.querySelector('input[type=file]'); if (input) input.value = '';
    } catch (err) {
      alert('Erro ao importar: ' + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">← {backLabel}</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{title}</h1>
        {existing != null && <p className="text-sm text-slate-500">{existingLabel || 'Já existem'} {existing} registro(s) cadastrado(s).</p>}
      </div>

      {result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">
            Importação concluída: {result.imported} novo(s)
            {result.duplicates ? `, ${result.duplicates} já existente(s) ignorado(s)` : ''}
            {result.skipped ? `, ${result.skipped} com erro` : ''}.
          </p>
          {result.errors?.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-amber-700 mt-2">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
        </div>
      )}

      {hints && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">Formato esperado</h2>
          {hints}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Selecione o arquivo CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700" />
        </label>
        {loading && <p className="text-sm text-slate-500">Lendo e analisando o arquivo…</p>}
      </div>

      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pré-visualização</h2>
              <p className="text-sm text-slate-500">{preview.total} linha(s) detectada(s).</p>
            </div>
            <button type="button" onClick={confirm} disabled={importing || preview.total === 0}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {importing ? 'Importando…' : (confirmLabel ? confirmLabel(preview.total) : `Confirmar e importar ${preview.total}`)}
            </button>
          </div>

          {warnings?.(preview)}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    {columns.map((c) => <td key={c.key} className="px-3 py-1.5 text-slate-700">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.total > preview.rows.length && (
              <p className="text-xs text-slate-400 mt-2">Mostrando {preview.rows.length} de {preview.total} linhas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
