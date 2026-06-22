import { Link, router, usePage } from '@inertiajs/react';
import FileUpload from '@/Components/FileUpload';

const TZ = 'America/Sao_Paulo';
const dt = (s) => s ? new Date(String(s).replace(' ', 'T')).toLocaleDateString('pt-BR', { timeZone: TZ }) : '-';
const dtime = (s) => s ? new Date(String(s).replace(' ', 'T')).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const genderLabel = (g) => ({ male: 'Masculino', m: 'Masculino', masculino: 'Masculino', female: 'Feminino', f: 'Feminino', feminino: 'Feminino' }[String(g || '').toLowerCase()] || '—');
const age = (b) => { if (!b) return null; const d = new Date(String(b).replace(' ', 'T')); const t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--; return a; };

export default function Show({ patient, recent = {}, counts = {} }) {
  const { flash } = usePage().props;
  const attachments = patient.attachments || [];
  const pid = patient.id;
  const a = age(patient.birth_date);

  const fileSize = (b) => !b ? '-' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const delAttachment = (id) => { if (confirm('Remover este anexo?')) router.delete(`/attachments/${id}`, { preserveState: true, preserveScroll: true }); };

  return (
    <div className="space-y-6">
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
              {patient.insurance && <span>Convênio: {patient.insurance}</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {patient.phone && <span>📞 {patient.phone}</span>}
              {patient.email && <span>✉ {patient.email}</span>}
              {patient.birth_date && <span>Nasc. {dt(patient.birth_date)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/patients/${pid}/records`} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Prontuário</Link>
            <Link href={`/appointments/create?patient_id=${pid}`} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Nova consulta</Link>
            <Link href={`/patients/${pid}/edit`} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Editar</Link>
          </div>
        </div>
      </div>

      {/* Documentos clínicos do paciente */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Documentos clínicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DocCard title="Receitas" count={counts.prescriptions} accent="emerald"
            items={(recent.prescriptions || []).map((p) => ({ id: p.id, line: dt(p.created_at), sub: p.doctor?.name }))}
            viewAll={`/prescriptions?patient_id=${pid}`} create={`/prescriptions/create?patient_id=${pid}`} show={(id) => `/prescriptions/${id}`} />
          <DocCard title="Exames" count={counts.exams} accent="violet"
            items={(recent.exams || []).map((e) => ({ id: e.id, line: dt(e.created_at), sub: e.status }))}
            viewAll={`/exam-requests?patient_id=${pid}`} create={`/exam-requests/create?patient_id=${pid}`} show={(id) => `/exam-requests/${id}`} />
          <DocCard title="Atestados / Laudos" count={counts.certificates} accent="amber"
            items={(recent.certificates || []).map((c) => ({ id: c.id, line: dt(c.created_at), sub: c.type }))}
            viewAll={`/certificates?patient_id=${pid}`} create={`/certificates/create?patient_id=${pid}`} show={(id) => `/certificates/${id}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas consultas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas consultas</h2>
          {(patient.appointments || []).length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma consulta registrada.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {patient.appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-2.5">
                  <p className="text-sm text-slate-700">{dtime(apt.starts_at)}</p>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anexos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Anexos</h2>
          <div className="mb-4"><FileUpload attachableType="App\Models\Patient" attachableId={pid} /></div>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum arquivo anexado.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{att.original_name}</p>
                    <p className="text-xs text-slate-400">{fileSize(att.size)} · {att.mime}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a href={`/attachments/${att.id}/download`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Baixar</a>
                    <button onClick={() => delAttachment(att.id)} className="text-sm text-rose-600 hover:text-rose-800 font-medium">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocCard({ title, count, items, viewAll, create, show, accent }) {
  const ring = { emerald: 'text-emerald-700 bg-emerald-50', violet: 'text-violet-700 bg-violet-50', amber: 'text-amber-700 bg-amber-50' }[accent] || 'text-slate-700 bg-slate-50';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ring}`}>{count ?? 0}</span>
      </div>
      <div className="flex-1 space-y-1 mb-3">
        {(items || []).length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum registro.</p>
        ) : items.slice(0, 3).map((it) => (
          <Link key={it.id} href={show(it.id)} className="flex items-center justify-between text-sm rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <span className="text-slate-700">{it.line}</span>
            {it.sub && <span className="text-xs text-slate-400 truncate ml-2">{it.sub}</span>}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Link href={viewAll} className="text-sm text-slate-500 hover:text-slate-800">Ver todos</Link>
        <Link href={create} className="ml-auto text-sm font-semibold text-blue-600 hover:text-blue-700">+ Novo</Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
  const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
