import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const COLUMN_LABELS = {
  name: 'Nome', social_name: 'Nome social', email: 'E-mail', phone: 'Telefone', whatsapp: 'WhatsApp', document: 'CPF',
  rg: 'RG', birth_date: 'Nascimento', gender: 'Sexo', marital_status: 'Estado civil',
  mother_name: 'Mãe', father_name: 'Pai', spouse_name: 'Cônjuge',
  addr_zip: 'CEP', addr_neighborhood: 'Bairro', addr_street: 'Endereço', addr_number: 'Número', addr_complement: 'Complemento', addr_city: 'Cidade',
  ins_name: 'Convênio', ins_number: 'Nº plano',
  note_occupation: 'Profissão', note_doctor_name: 'Profissional', note_legacy_notes: 'Observações', note_status: 'Status',
};

export default function Import({ existing }) {
  const { flash, importErrors } = usePage().props;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const doPreview = async (f) => {
    setLoading(true); setPreview(null); setResult(null);
    const fd = new FormData(); fd.append('file', f);
    try {
      const { data } = await window.axios.post('/patients-import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
    } catch (e) {
      alert('Erro ao pré-visualizar: ' + (e.response?.data?.message || e.message));
    } finally { setLoading(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0]; setFile(f);
    if (f) doPreview(f);
  };

  // Confirma usando o MESMO axios.post do preview (que comprovadamente funciona nesta
  // página). O controller responde JSON quando a chamada é XHR. Nada de useForm/Inertia
  // no meio — era isso que não disparava request nenhuma.
  const confirm = async (e) => {
    e.preventDefault();
    if (!file || importing) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await window.axios.post('/patients-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/patients" className="text-sm text-slate-500 hover:text-slate-800">← Pacientes</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Importar pacientes (CSV)</h1>
          <p className="text-sm text-slate-500">Sua clínica já tem {existing} paciente(s) cadastrado(s).</p>
        </div>
      </div>

      {result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Importação concluída: {result.imported} paciente(s) adicionado(s){result.skipped ? `, ${result.skipped} ignorado(s)` : ''}.</p>
          {result.errors?.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-amber-700 mt-2">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          )}
          <Link href="/patients" className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800">Ver pacientes →</Link>
        </div>
      )}
      {flash?.success && !result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{flash.success}</div>
      )}
      {importErrors && importErrors.length > 0 && !result && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold mb-1">Alguns avisos:</p>
          <ul className="list-disc pl-5 text-xs">{importErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Formato esperado</h2>
        <p className="text-sm text-slate-600">CSV (separador <code>,</code> ou <code>;</code>) com cabeçalhos. Colunas aceitas:</p>
        <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 overflow-x-auto">
          name, email, phone, document, birth_date, gender
        </code>
        <p className="text-xs text-slate-500">Aliases em português também funcionam: <em>nome, telefone, cpf, nascimento, sexo</em>. Datas em <code>dd/mm/yyyy</code> ou <code>yyyy-mm-dd</code>. Gênero: M/F/Outro (ou Masculino/Feminino).</p>
        <p className="text-xs text-slate-500">Exports de sistemas legados também funcionam: colunas como <em>CEP, Bairro, Endereço, Plano de saúde, RG, Profissional</em> etc. são reconhecidas automaticamente (endereço e convênio viram dados estruturados; o resto é anexado às observações do paciente). Encoding ISO-8859-1 é convertido automaticamente.</p>
      </div>

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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pré-visualização</h2>
              <p className="text-sm text-slate-500">{preview.total} linhas detectadas · colunas reconhecidas: <span className="font-mono text-xs">{preview.mapped_columns.join(', ')}</span></p>
            </div>
            <button type="button" onClick={confirm} disabled={importing || preview.total === 0}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {importing ? 'Importando…' : `Confirmar e importar ${preview.total} paciente(s)`}
            </button>
          </div>
          {preview.errors?.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <strong>Avisos na leitura:</strong> {preview.errors.slice(0, 5).join(' · ')}{preview.errors.length > 5 ? ` e mais ${preview.errors.length-5}` : ''}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                <tr>{preview.mapped_columns.map((c) => <th key={c} className="px-3 py-2">{COLUMN_LABELS[c] || c}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    {preview.mapped_columns.map((c) => <td key={c} className="px-3 py-1.5 text-slate-700">{row[c] ?? '—'}</td>)}
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
