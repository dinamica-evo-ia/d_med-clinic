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
  // Permite deep-link pra uma aba via ?tab= (usado pelos ícones da listagem: Prontuário, Anotações)
  const initialTab = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab')) || 'resumo';
  const [tab, setTab] = useState(initialTab);

  const TABS = [
    ['resumo', 'Resumo'],
    ['evolucoes', `Evoluções${counts.records ? ` (${counts.records})` : ''}`],
    ['alergias', `Alergias${(patient.allergies || []).length ? ` (${patient.allergies.length})` : ''}`],
    ['composicao', 'Composição Corporal'],
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
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white grid place-items-center text-xl font-bold shrink-0 overflow-hidden">
            {patient.photo_url ? <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" /> : initials(patient.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            {patient.social_name && <p className="text-sm text-slate-500">Nome social: {patient.social_name}</p>}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {a !== null && <span>{a} anos</span>}
              <span>{genderLabel(patient.gender)}</span>
              {patient.document && <span>CPF {patient.document}</span>}
              {patient.phone && <span>📞 {patient.phone}</span>}
              {patient.whatsapp && <span>💬 {patient.whatsapp}</span>}
              {patient.email && <span>✉ {patient.email}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NovaConsulta pid={pid} />
            <Link href={`/appointments/create?patient_id=${pid}`} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Agendar</Link>
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
        {tab === 'alergias' && <Alergias patient={patient} pid={pid} />}
        {tab === 'composicao' && <Composicao patient={patient} pid={pid} />}
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

const MARITAL_LABELS = { solteiro: 'Solteiro(a)', casado: 'Casado(a)', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)', uniao_estavel: 'União estável' };

function Resumo({ patient, a }) {
  const appts = patient.appointments || [];
  const addr = asObj(patient.address);
  const emerg = asObj(patient.emergency_contact);
  const addrLine = [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city && addr.state ? `${addr.city}/${addr.state}` : addr.city, addr.zip].filter(Boolean).join(', ');
  const rgLine = [patient.rg, patient.rg_issuer, patient.rg_state].filter(Boolean).join(' ');
  const Field = ({ l, v }) => <div><p className="text-xs text-slate-400 uppercase tracking-wide">{l}</p><p className="text-sm text-slate-900">{v || '—'}</p></div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Dados</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field l="Nascimento" v={patient.birth_date ? `${dt(patient.birth_date)}${a !== null ? ` (${a} anos)` : ''}` : '—'} />
          <Field l="Gênero" v={genderLabel(patient.gender)} />
          <Field l="Estado civil" v={MARITAL_LABELS[patient.marital_status]} />
          <Field l="CPF" v={patient.is_foreign ? `${patient.document || '—'} (estrangeiro)` : patient.document} />
          <Field l="RG" v={rgLine} />
          <Field l="Telefone" v={patient.phone} />
          <Field l="WhatsApp" v={patient.whatsapp} />
          <Field l="E-mail" v={patient.email} />
          <Field l="Convênio" v={typeof patient.insurance === 'string' ? patient.insurance : (patient.insurance?.name || '—')} />
          <Field l="Nome da mãe" v={patient.mother_name} />
          <Field l="Nome do pai" v={patient.father_name} />
          <Field l="Cônjuge" v={patient.spouse_name} />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Endereço e contato de emergência</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field l="Endereço" v={addrLine} />
          <Field l="Referência" v={addr.reference} />
          <Field l="Contato de emergência" v={emerg.name} />
          <Field l="Telefone de emergência" v={emerg.phone} />
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

function NovaConsulta({ pid }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5">
        Nova consulta <span className="text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5">
            <Link href={`/studio-med?patient_id=${pid}`} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
              <span className="text-lg">🎙️</span>
              <span><span className="block text-sm font-semibold text-slate-800">Gravada (Studio Med)</span><span className="block text-xs text-slate-400">Grava a consulta e gera a anamnese com IA</span></span>
            </Link>
            <Link href={`/patients/${pid}/records/create`} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
              <span className="text-lg">✍️</span>
              <span><span className="block text-sm font-semibold text-slate-800">Manual</span><span className="block text-xs text-slate-400">Preencher o prontuário manualmente</span></span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Alergias({ patient, pid }) {
  const items = patient.allergies || [];
  const form = useForm({ substance: '', reaction: '', severity: '', notes: '' });
  const add = (e) => { e.preventDefault(); form.post(`/patients/${pid}/allergies`, { preserveScroll: true, onSuccess: () => form.reset() }); };
  const del = (id) => { if (confirm('Remover esta alergia?')) router.delete(`/allergies/${id}`, { preserveScroll: true }); };
  const sev = (s) => ({ grave: 'bg-rose-100 text-rose-700', moderada: 'bg-amber-100 text-amber-700', leve: 'bg-emerald-100 text-emerald-700' }[String(s || '').toLowerCase()] || 'bg-slate-100 text-slate-600');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Alergias</h2>
        {items.length === 0 ? <p className="text-sm text-slate-400">Nenhuma alergia registrada.</p> : (
          <div className="divide-y divide-slate-100">
            {items.map((al) => (
              <div key={al.id} className="flex items-start justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{al.substance}</p>
                    {al.severity && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev(al.severity)}`}>{al.severity}</span>}
                  </div>
                  {al.reaction && <p className="text-xs text-slate-500">Reação: {al.reaction}</p>}
                  {al.notes && <p className="text-xs text-slate-400">{al.notes}</p>}
                </div>
                <button onClick={() => del(al.id)} className="text-sm text-rose-600 hover:text-rose-800 shrink-0">Remover</button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 className="font-semibold text-slate-900 mb-3">Adicionar alergia</h3>
        <form onSubmit={add} className="space-y-3">
          <input value={form.data.substance} onChange={(e) => form.setData('substance', e.target.value)} required placeholder="Substância (ex.: Dipirona)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.data.reaction} onChange={(e) => form.setData('reaction', e.target.value)} placeholder="Reação (ex.: urticária)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={form.data.severity} onChange={(e) => form.setData('severity', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Gravidade…</option><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option>
          </select>
          <textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} placeholder="Observações" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button disabled={form.processing} className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2 hover:bg-blue-700 disabled:opacity-60">Adicionar</button>
        </form>
      </Card>
    </div>
  );
}

function Composicao({ patient, pid }) {
  const items = patient.body_compositions || [];
  const form = useForm({ measured_at: new Date().toISOString().slice(0, 10), weight: '', height: '', body_fat: '', lean_mass: '', waist: '', hip: '', notes: '' });
  const add = (e) => { e.preventDefault(); form.post(`/patients/${pid}/body-compositions`, { preserveScroll: true, onSuccess: () => form.reset('weight', 'height', 'body_fat', 'lean_mass', 'waist', 'hip', 'notes') }); };
  const del = (id) => { if (confirm('Remover esta avaliação?')) router.delete(`/body-compositions/${id}`, { preserveScroll: true }); };
  const liveBmi = (form.data.weight && form.data.height) ? (form.data.weight / Math.pow(form.data.height / 100, 2)).toFixed(1) : null;
  const F = ({ k, label, suf }) => (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input type="number" step="0.1" value={form.data[k]} onChange={(e) => form.setData(k, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={suf} />
    </label>
  );
  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-semibold text-slate-900 mb-3">Nova avaliação{liveBmi ? ` · IMC ${liveBmi}` : ''}</h3>
        <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block"><span className="text-xs text-slate-400">Data</span><input type="date" value={form.data.measured_at} onChange={(e) => form.setData('measured_at', e.target.value)} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <F k="weight" label="Peso (kg)" />
          <F k="height" label="Altura (cm)" />
          <F k="body_fat" label="% Gordura" />
          <F k="lean_mass" label="Massa magra (kg)" />
          <F k="waist" label="Cintura (cm)" />
          <F k="hip" label="Quadril (cm)" />
          <label className="block"><span className="text-xs text-slate-400">Obs.</span><input value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <div className="col-span-2 sm:col-span-4"><button disabled={form.processing} className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-5 py-2 hover:bg-blue-700 disabled:opacity-60">Registrar avaliação</button></div>
        </form>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Histórico</h2>
        {items.length === 0 ? <p className="text-sm text-slate-400">Nenhuma avaliação registrada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">Data</th><th className="pr-3">Peso</th><th className="pr-3">Altura</th><th className="pr-3">IMC</th><th className="pr-3">% Gord.</th><th className="pr-3">M. magra</th><th className="pr-3">Cint.</th><th className="pr-3">Quadril</th><th></th>
              </tr></thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 text-slate-700">{dt(b.measured_at)}</td>
                    <td className="pr-3">{b.weight ? `${b.weight} kg` : '—'}</td>
                    <td className="pr-3">{b.height ? `${b.height} cm` : '—'}</td>
                    <td className="pr-3 font-semibold text-slate-800">{b.bmi || '—'}</td>
                    <td className="pr-3">{b.body_fat ? `${b.body_fat}%` : '—'}</td>
                    <td className="pr-3">{b.lean_mass ? `${b.lean_mass} kg` : '—'}</td>
                    <td className="pr-3">{b.waist ? `${b.waist}` : '—'}</td>
                    <td className="pr-3">{b.hip ? `${b.hip}` : '—'}</td>
                    <td className="text-right"><button onClick={() => del(b.id)} className="text-rose-600 hover:text-rose-800 text-xs">Remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
  const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
