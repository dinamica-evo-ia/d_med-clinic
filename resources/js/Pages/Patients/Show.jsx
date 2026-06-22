import { Link, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import FileUpload from '@/Components/FileUpload';

const TZ = 'America/Sao_Paulo';
const dt = (s) => s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString('pt-BR', { timeZone: TZ }) : '-';
const dtime = (s) => s ? new Date(String(s).replace(' ', 'T')).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const genderLabel = (g) => ({ male: 'Masculino', m: 'Masculino', masculino: 'Masculino', female: 'Feminino', f: 'Feminino', feminino: 'Feminino' }[String(g || '').toLowerCase()] || '—');
const ageOf = (b) => { if (!b) return null; const d = new Date(String(b).replace(' ', 'T')); const t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--; return a; };
const asObj = (v) => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v) || {}; } catch { return {}; } };
const asArr = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; } };
const isImg = (m) => String(m || '').startsWith('image/');
const fileSize = (b) => !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

export default function Show({ patient, prescriptions = [], exams = [], certificates = [], cids = [], counts = {} }) {
  const { flash } = usePage().props;
  const pid = patient.id;
  const a = ageOf(patient.birth_date);
  const records = patient.medical_records || patient.medicalRecords || [];
  const attachments = patient.attachments || [];
  const gallery = attachments.filter((x) => isImg(x.mime));
  const docs = attachments.filter((x) => !isImg(x.mime));
  const [tab, setTab] = useState('resumo');

  const TABS = [
    ['resumo', 'Resumo'],
    ['evolucoes', `Evoluções${counts.records ? ` (${counts.records})` : ''}`],
    ['exames', `Exames${counts.exams ? ` (${counts.exams})` : ''}`],
    ['receitas', `Receitas${counts.prescriptions ? ` (${counts.prescriptions})` : ''}`],
    ['atestados', `Atestados/Laudos${counts.certificates ? ` (${counts.certificates})` : ''}`],
    ['cids', `CIDs${counts.cids ? ` (${counts.cids})` : ''}`],
    ['galeria', `Galeria${gallery.length ? ` (${gallery.length})` : ''}`],
    ['documentos', `Documentos${docs.length ? ` (${docs.length})` : ''}`],
    ['anotacoes', 'Anotações'],
  ];

  return (
    <div className="space-y-5">
      {flash?.success && <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{flash.success}</div>}
      <Link href="/patients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">← Pacientes</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white grid place-items-center text-xl font-bold shrink-0">{initials(patient.name)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {a !== null && <span>{a} anos</span>}
              <span>{genderLabel(patient.gender)}</span>
              {patient.document && <span>CPF {patient.document}</span>}
              {patient.phone && <span>📞 {patient.phone}</span>}
              {patient.email && <span>✉ {patient.email}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/patients/${pid}/records/create`} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">+ Evolução</Link>
            <Link href={`/appointments/create?patient_id=${pid}`} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Nova consulta</Link>
            <Link href={`/patients/${pid}/edit`} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Editar</Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {tab === 'resumo' && <Resumo patient={patient} a={a} />}
        {tab === 'evolucoes' && <Evolucoes records={records} pid={pid} />}
        {tab === 'exames' && <DocList title="Exames" items={exams} pid={pid} base="exam-requests" render={(e) => ({ main: dt(e.created_at), sub: e.status })} />}
        {tab === 'receitas' && <DocList title="Receitas" items={prescriptions} pid={pid} base="prescriptions" render={(p) => ({ main: dt(p.created_at), sub: p.doctor?.name })} />}
        {tab === 'atestados' && <DocList title="Atestados / Laudos" items={certificates} pid={pid} base="certificates" render={(c) => ({ main: dt(c.created_at), sub: c.type })} />}
        {tab === 'cids' && <Cids cids={cids} />}
        {tab === 'galeria' && <Galeria items={gallery} pid={pid} />}
        {tab === 'documentos' && <Documentos items={docs} pid={pid} />}
        {tab === 'anotacoes' && <Anotacoes patient={patient} pid={pid} />}
      </div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>{children}</div>;
}

function Resumo({ patient, a }) {
  const appts = patient.appointments || [];
  const Field = ({ l, v }) => <div><p className="text-xs text-slate-400 uppercase tracking-wide">{l}</p><p className="text-sm text-slate-900">{v || '—'}</p></div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Dados</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field l="Nascimento" v={patient.birth_date ? `${dt(patient.birth_date)}${a !== null ? ` (${a} anos)` : ''}` : '—'} />
          <Field l="Gênero" v={genderLabel(patient.gender)} />
          <Field l="CPF" v={patient.document} />
          <Field l="Telefone" v={patient.phone} />
          <Field l="E-mail" v={patient.email} />
          <Field l="Convênio" v={typeof patient.insurance === 'string' ? patient.insurance : (patient.insurance?.name || '—')} />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas consultas</h2>
        {appts.length === 0 ? <p className="text-sm text-slate-400">Nenhuma consulta.</p> : (
          <div className="divide-y divide-slate-100">
            {appts.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-slate-700">{dtime(apt.starts_at)}</span>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Evolucoes({ records, pid }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Evoluções / Prontuário</h2>
        <Link href={`/patients/${pid}/records/create`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Nova evolução</Link>
      </div>
      {records.length === 0 ? <p className="text-sm text-slate-400">Nenhuma evolução registrada.</p> : (
        <div className="space-y-3">
          {records.map((r) => {
            const an = asObj(r.anamnesis); const diag = asArr(r.diagnosis);
            const resumo = an.resumo || an.hda || an.queixa_principal || '';
            return (
              <Link key={r.id} href={`/patients/${pid}/records/${r.id}`} className="block rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{dt(r.created_at)}{r.doctor?.name ? ` · ${r.doctor.name}` : ''}</p>
                  {r.origem === 'studio_med' && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">Studio Med</span>}
                </div>
                {resumo && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{resumo}</p>}
                {diag.length > 0 && <p className="mt-1 text-xs text-slate-400">Diagnóstico: {diag.map((d) => d.description || d.code).filter(Boolean).join(' · ')}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function DocList({ title, items, pid, base, render }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-3">
          <Link href={`/${base}?patient_id=${pid}`} className="text-sm text-slate-500 hover:text-slate-800">Ver todos</Link>
          <Link href={`/${base}/create?patient_id=${pid}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Novo</Link>
        </div>
      </div>
      {items.length === 0 ? <p className="text-sm text-slate-400">Nenhum registro.</p> : (
        <div className="divide-y divide-slate-100">
          {items.map((it) => {
            const r = render(it);
            return (
              <Link key={it.id} href={`/${base}/${it.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                <span className="text-sm text-slate-700">{r.main}</span>
                {r.sub && <span className="text-xs text-slate-400">{r.sub}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Cids({ cids }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">CIDs do paciente</h2>
      {cids.length === 0 ? <p className="text-sm text-slate-400">Nenhum CID registrado nas evoluções.</p> : (
        <div className="flex flex-wrap gap-2">
          {cids.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
              {c.code && <span className="font-semibold text-blue-700">{c.code}</span>}
              <span className="text-slate-600">{c.description || ''}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Galeria({ items, pid }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Galeria</h2>
      </div>
      <div className="mb-4"><FileUpload attachableType="App\Models\Patient" attachableId={pid} /></div>
      {items.length === 0 ? <p className="text-sm text-slate-400">Nenhuma imagem.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((att) => (
            <a key={att.id} href={`/attachments/${att.id}/download`} target="_blank" rel="noreferrer"
              className="group block rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50">
              <img src={`/attachments/${att.id}/download`} alt={att.original_name} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

function Documentos({ items, pid }) {
  const del = (id) => { if (confirm('Remover este documento?')) router.delete(`/attachments/${id}`, { preserveState: true, preserveScroll: true }); };
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Documentos</h2>
      <div className="mb-4"><FileUpload attachableType="App\Models\Patient" attachableId={pid} /></div>
      {items.length === 0 ? <p className="text-sm text-slate-400">Nenhum documento.</p> : (
        <div className="divide-y divide-slate-100">
          {items.map((att) => (
            <div key={att.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{att.original_name}</p>
                <p className="text-xs text-slate-400">{fileSize(att.size)} · {att.mime}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a href={`/attachments/${att.id}/download`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Baixar</a>
                <button onClick={() => del(att.id)} className="text-sm text-rose-600 hover:text-rose-800 font-medium">Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Anotacoes({ patient, pid }) {
  const form = useForm({ notes: patient.notes || '' });
  const save = (e) => { e.preventDefault(); form.patch(`/patients/${pid}/notes`, { preserveScroll: true }); };
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Anotações</h2>
        <button onClick={save} disabled={form.processing}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {form.processing ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      <textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={12}
        placeholder="Anotações gerais sobre o paciente (visível apenas internamente)..."
        className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </Card>
  );
}

function StatusBadge({ status }) {
  const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
  const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
