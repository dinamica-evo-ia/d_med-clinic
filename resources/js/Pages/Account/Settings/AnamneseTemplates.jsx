import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AnamneseTemplates() {
  const { doctors = [], doctor, templates = [], defaultFields = [], flash, errors } = usePage().props;
  const [editing, setEditing] = useState(null); // template sendo editado ou 'new'

  const onSelectDoctor = (id) => router.get('/account/settings/anamnese-templates', { doctor_id: id }, { preserveState: false });

  const startNew = () => setEditing({
    id: null,
    name: '',
    description: '',
    fields: defaultFields.map((f) => ({ ...f })), // pré-preenche com o padrão
    is_default: templates.length === 0, // 1º template do médico já vira default
  });

  const startEdit = (t) => setEditing({
    id: t.id,
    name: t.name,
    description: t.description || '',
    fields: (t.fields || []).map((f) => ({ ...f })),
    is_default: t.is_default,
  });

  const del = (t) => {
    if (!confirm(`Remover o modelo "${t.name}"?`)) return;
    router.delete(`/account/settings/anamnese-templates/${t.id}`, { preserveScroll: true });
  };

  const setDefault = (t) => {
    router.post(`/account/settings/anamnese-templates/${t.id}/default`, {}, { preserveScroll: true });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/account/settings/doctor" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Modelos de Anamnese</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize os campos que a IA vai preencher a partir da consulta gravada. Cada médico tem os seus modelos; o modelo <strong>padrão</strong> é o que será usado nas gravações do Studio Med.</p>
      </div>

      {flash?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{flash.success}</div>
      )}
      {errors?.delete && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{errors.delete}</div>
      )}

      {/* Seletor de médico */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Médico</span>
          <select
            value={doctor?.id || ''}
            onChange={(e) => onSelectDoctor(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={!doctors.length}
          >
            {!doctors.length && <option value="">Nenhum médico cadastrado</option>}
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>

      {!doctor ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-800">
          Cadastre um médico ativo em <Link href="/doctors" className="font-semibold underline">/doctors</Link> para configurar modelos de anamnese.
        </div>
      ) : (
        <>
          {/* Lista de templates */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Modelos de {doctor.name}</p>
                <p className="text-xs text-slate-500">{templates.length} modelo(s)</p>
              </div>
              <button onClick={startNew} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
                + Novo modelo
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 italic">Nenhum modelo ainda.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <div key={t.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                        {t.is_default && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Padrão</span>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-slate-500 mt-1"><span className="font-medium text-slate-600">{t.fields?.length || 0}</span> campo(s): <span className="italic">{(t.fields || []).slice(0, 5).map((f) => f.label).join(' · ')}{t.fields?.length > 5 ? '…' : ''}</span></p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!t.is_default && (
                        <button onClick={() => setDefault(t)} className="text-xs text-slate-500 hover:text-emerald-700">Tornar padrão</button>
                      )}
                      <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <button onClick={() => del(t)} className="text-xs text-rose-600 hover:text-rose-800 font-medium">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {editing && doctor && (
        <TemplateForm
          initial={editing}
          doctorId={doctor.id}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TemplateForm({ initial, doctorId, onClose }) {
  const form = useForm({
    doctor_id: doctorId,
    name: initial.name,
    description: initial.description,
    fields: initial.fields,
    is_default: initial.is_default,
  });

  const setField = (idx, patch) => {
    const next = [...form.data.fields];
    next[idx] = { ...next[idx], ...patch };
    form.setData('fields', next);
  };

  const addField = () => form.setData('fields', [...form.data.fields, { key: '', label: '', hint: '' }]);
  const removeField = (idx) => form.setData('fields', form.data.fields.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= form.data.fields.length) return;
    const next = [...form.data.fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    form.setData('fields', next);
  };

  const submit = (e) => {
    e.preventDefault();
    const opts = { preserveScroll: true, onSuccess: onClose };
    if (initial.id) form.put(`/account/settings/anamnese-templates/${initial.id}`, opts);
    else form.post('/account/settings/anamnese-templates', opts);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{initial.id ? 'Editar modelo' : 'Novo modelo'}</h2>
            <p className="text-xs text-slate-500">Os campos abaixo serão preenchidos pela IA a partir da transcrição da consulta.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Nome do modelo</span>
            <input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required
              placeholder='Ex.: "Cardiologia — 1ª consulta"'
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            {form.errors.name && <span className="text-xs text-rose-600">{form.errors.name}</span>}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Descrição (opcional)</span>
            <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)}
              rows={2} placeholder="Como esse modelo deve ser usado…"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Campos do modelo</span>
              <button type="button" onClick={addField} className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ Adicionar campo</button>
            </div>
            <div className="space-y-2">
              {form.data.fields.map((f, i) => (
                <div key={i} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1.5 text-slate-400">
                    <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0} className="text-[10px] hover:text-slate-700 disabled:opacity-30">▲</button>
                    <button type="button" onClick={() => moveField(i, +1)} disabled={i === form.data.fields.length - 1} className="text-[10px] hover:text-slate-700 disabled:opacity-30">▼</button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} required
                      placeholder="Título do campo (ex.: Queixa principal)"
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white" />
                    <input value={f.hint || ''} onChange={(e) => setField(i, { hint: e.target.value })}
                      placeholder="Dica pra IA (opcional) — ex.: 'foco em sintomas visuais'"
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs bg-white" />
                  </div>
                  <button type="button" onClick={() => removeField(i)} className="text-xs text-rose-500 hover:text-rose-700 shrink-0">Remover</button>
                </div>
              ))}
              {form.data.fields.length === 0 && (
                <p className="text-xs text-slate-500 italic">Adicione pelo menos um campo.</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 select-none cursor-pointer pt-2">
            <input type="checkbox" checked={!!form.data.is_default} onChange={(e) => form.setData('is_default', e.target.checked)} className="rounded border-slate-300" />
            <span className="text-sm text-slate-700">Marcar como <strong>modelo padrão</strong> (usado automaticamente ao gravar consulta)</span>
          </label>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">Cancelar</button>
          <button type="submit" disabled={form.processing || form.data.fields.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {form.processing ? 'Salvando…' : (initial.id ? 'Salvar alterações' : 'Criar modelo')}
          </button>
        </div>
      </form>
    </div>
  );
}
