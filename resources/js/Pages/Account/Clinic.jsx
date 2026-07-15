import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import UserFormModal from '@/Pages/Users/Partials/UserFormModal';

/*
 * Médico / Clínica / Usuários — as três coisas em abas, abertas pelo menu do avatar.
 * A aba Usuários só existe pra admin (o backend nem manda a prop `users` pros outros).
 */

const TABS = [
  { key: 'medico', label: 'Médico' },
  { key: 'clinica', label: 'Clínica' },
  { key: 'usuarios', label: 'Usuários', adminOnly: true },
];

const ROLE_LABELS = { admin: 'Admin', doctor: 'Médico', receptionist: 'Secretária' };
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  doctor: 'bg-blue-100 text-blue-700',
  receptionist: 'bg-green-100 text-green-700',
};
const PERMISSION_BADGE_LABELS = { financeiro: 'Financeiro' };

export default function Clinic({ doctors = [], doctor, clinic, users, grantablePermissions = [], states = [] }) {
  const { auth, tenant, flash } = usePage().props;
  const isAdmin = auth?.role === 'admin';
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'medico';
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : 'medico');

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  const goTab = (key) => {
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Médico / Clínica / Usuários</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dados cadastrais do profissional, da clínica e quem tem acesso ao sistema.
        </p>
      </div>

      {flash?.success && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {flash.success}
        </div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => goTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'medico' && <DoctorTab doctors={doctors} doctor={doctor} states={states} />}
      {tab === 'clinica' && <ClinicTab clinic={clinic} tenant={tenant} states={states} />}
      {tab === 'usuarios' && isAdmin && (
        <UsersTab users={users || []} grantablePermissions={grantablePermissions} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Médico */

function DoctorTab({ doctors, doctor, states }) {
  const [form, setForm] = useState(() => ({ ...emptyDoctor, ...(doctor || {}) }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  if (!doctor) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Nenhum médico cadastrado nesta clínica ainda. Cadastre em <b>Médicos</b>, no menu lateral.
        </p>
      </Card>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    router.put(`/account/clinica/medico/${doctor.id}`, form, {
      preserveScroll: true,
      onError: (errs) => setErrors(errs || {}),
      onFinish: () => setSaving(false),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {doctors.length > 1 && (
        <Card title="Profissional">
          <Field label="Editando" span={2}>
            <select
              value={doctor.id}
              onChange={(e) => router.get('/account/clinica', { tab: 'medico', doctor_id: e.target.value })}
              className={inputClass}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </Card>
      )}

      <Card title="Dados profissionais">
        <Field label="Nome" required span={2} error={errors.name}>
          <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Especialidade" error={errors.specialty}>
          <input value={form.specialty || ''} onChange={(e) => set('specialty', e.target.value)}
            placeholder="Clínica Médica" className={inputClass} />
        </Field>
        <Field label="CPF" error={errors.document}>
          <input value={form.document || ''} onChange={(e) => set('document', e.target.value)}
            placeholder="000.000.000-00" className={inputClass} />
        </Field>
        <Field label="CRM" error={errors.license_number}>
          <input value={form.license_number || ''} onChange={(e) => set('license_number', e.target.value)}
            placeholder="12345" className={inputClass} />
        </Field>
        <Field label="UF do CRM" error={errors.license_state}>
          <select value={form.license_state || ''} onChange={(e) => set('license_state', e.target.value)} className={inputClass}>
            <option value="">—</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="RQE" hint="Registro de Qualificação de Especialista" error={errors.rqe}>
          <input value={form.rqe || ''} onChange={(e) => set('rqe', e.target.value)} className={inputClass} />
        </Field>
      </Card>

      <Card title="Contato">
        <Field label="E-mail" span={2} error={errors.email}>
          <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Telefone" error={errors.phone}>
          <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)}
            placeholder="(47) 99999-0000" className={inputClass} />
        </Field>
        <Field label="Observações" full error={errors.bio}>
          <textarea value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} rows={3} className={inputClass} />
        </Field>
      </Card>

      <SaveBar saving={saving} />
    </form>
  );
}

const emptyDoctor = {
  name: '', email: '', phone: '', specialty: '', license_number: '',
  license_state: '', rqe: '', document: '', bio: '', is_active: true,
};

/* --------------------------------------------------------------- Clínica */

function ClinicTab({ clinic, tenant, states }) {
  const [form, setForm] = useState(() => ({ ...clinic }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const { logo_url, logo_path, ...payload } = form;
    router.put('/account/clinica', payload, {
      preserveScroll: true,
      onError: (errs) => setErrors(errs || {}),
      onFinish: () => setSaving(false),
    });
  };

  const uploadLogo = (file) => {
    if (!file) return;
    router.post('/account/clinica/logo', { logo: file }, { preserveScroll: true, forceFormData: true });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card title="Informações da empresa">
        <Field label="ID da clínica" hint="Identificador no D_Med — não editável">
          <input value={tenant?.slug || tenant?.id?.slice(0, 8) || ''} disabled
            className={`${inputClass} bg-slate-50 text-slate-400`} />
        </Field>
        <Field label="Nome completo / Razão social" span={2} error={errors.legal_name}>
          <input value={form.legal_name || ''} onChange={(e) => set('legal_name', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Natureza" error={errors.nature}>
          <select value={form.nature || 'pessoa_fisica'} onChange={(e) => set('nature', e.target.value)} className={inputClass}>
            <option value="pessoa_fisica">Pessoa física</option>
            <option value="pessoa_juridica">Pessoa jurídica</option>
          </select>
        </Field>
        <Field label={form.nature === 'pessoa_juridica' ? 'CNPJ' : 'CPF'} error={errors.document}>
          <input value={form.document || ''} onChange={(e) => set('document', e.target.value)}
            placeholder={form.nature === 'pessoa_juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
            className={inputClass} />
        </Field>
      </Card>

      <Card title="Informações de contato">
        <Field label="E-mail" required error={errors.email}>
          <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Telefone" error={errors.phone}>
          <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="(47) 3333-0000" className={inputClass} />
        </Field>
        <Field label="Celular" error={errors.mobile}>
          <input value={form.mobile || ''} onChange={(e) => set('mobile', e.target.value)} placeholder="(47) 99999-0000" className={inputClass} />
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp}>
          <input value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(47) 99999-0000" className={inputClass} />
        </Field>
      </Card>

      <Card title="Endereço e localização">
        <Field label="CEP" error={errors.zip}>
          <input value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} placeholder="89251-702" className={inputClass} />
        </Field>
        <Field label="Logradouro" span={2} error={errors.street}>
          <input value={form.street || ''} onChange={(e) => set('street', e.target.value)}
            placeholder="Avenida Marechal Deodoro da Fonseca" className={inputClass} />
        </Field>
        <Field label="Número" error={errors.number}>
          <input value={form.number || ''} onChange={(e) => set('number', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Bairro" error={errors.district}>
          <input value={form.district || ''} onChange={(e) => set('district', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Cidade" error={errors.city}>
          <input value={form.city || ''} onChange={(e) => set('city', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Estado" error={errors.state}>
          <select value={form.state || ''} onChange={(e) => set('state', e.target.value)} className={inputClass}>
            <option value="">—</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Complemento" error={errors.complement}>
          <input value={form.complement || ''} onChange={(e) => set('complement', e.target.value)}
            placeholder="Salas 208/209" className={inputClass} />
        </Field>
      </Card>

      <Card title="Logo">
        <div className="col-span-full flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo da clínica" className="h-16 w-16 rounded-xl object-contain border border-slate-200 bg-white p-1" />
          ) : (
            <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 grid place-items-center text-[11px] text-slate-400">
              sem logo
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
              Procurar
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </label>
            {form.logo_url && (
              <button type="button"
                onClick={() => router.delete('/account/clinica/logo', { preserveScroll: true })}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
                Remover
              </button>
            )}
          </div>
        </div>
      </Card>

      <SaveBar saving={saving} label="Salvar informações" />
    </form>
  );
}

/* -------------------------------------------------------------- Usuários */

function UsersTab({ users, grantablePermissions }) {
  const { auth } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = (u) => { setEditing(u); setShowModal(true); };
  const remove = (u) => {
    if (confirm(`Remover ${u.name} da clínica?`)) router.delete(`/users/${u.id}`, { preserveScroll: true });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Quem tem acesso ao sistema. Para cadastrar uma secretária, escolha o papel <b>Secretária</b>.
        </p>
        <button onClick={openCreate}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          + Novo usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Nome</Th><Th>E-mail</Th><Th>Papel</Th><Th>Status</Th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Nenhum usuário.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-700'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {(u.permissions || []).map((p) => (
                    <span key={p} className="ml-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      + {PERMISSION_BADGE_LABELS[p] || p}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-sm ${u.is_active ? 'text-green-600' : 'text-rose-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-rose-400'}`} />
                    {u.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Editar</button>
                    {u.id !== auth.user?.id && (
                      <button onClick={() => remove(u)} className="text-sm font-medium text-rose-500 hover:text-rose-700">Remover</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserFormModal show={showModal} onClose={() => setShowModal(false)} user={editing}
        grantablePermissions={grantablePermissions} />
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {title && <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h2>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

/* Tailwind não monta classe dinâmica (col-span-${n} não existe no build) — mapa fixo. */
const SPAN = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 xl:col-span-3',
  full: 'col-span-full',
};

function Field({ label, children, required, span = 1, full, hint, error }) {
  return (
    <div className={full ? SPAN.full : SPAN[span]}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {required && <span className="text-rose-500">* </span>}{label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SaveBar({ saving, label = 'Salvar' }) {
  return (
    <div className="flex justify-end">
      <button type="submit" disabled={saving}
        className="rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60">
        {saving ? 'Salvando...' : label}
      </button>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">{children}</th>;
}
