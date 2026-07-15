import { useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import PatientPicker from '@/Components/shared/PatientPicker';
import FileDrop from '@/Components/shared/FileDrop';
import ExamTabs from './Partials/ExamTabs';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';

export default function Form({ patients = [], doctors = [] }) {
  const [files, setFiles] = useState([]);
  const { data, setData, post, processing, errors } = useForm({
    patient_id: patients[0]?.id || '',
    doctor_id: doctors.length === 1 ? doctors[0].id : '',
    title: '',
    description: '',
    result_date: new Date().toISOString().slice(0, 10),
  });

  const submit = (e) => {
    e.preventDefault();
    // forceFormData: tem arquivo no meio, então vai como multipart
    post('/exam-results', { ...data, files, forceFormData: true });
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Exames</h1>
        <p className="mt-1 text-sm text-slate-500">Guardar o resultado que voltou do laboratório.</p>
      </div>

      <ExamTabs active="resultados" />

      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                <span className="text-rose-500">* </span>Paciente
              </label>
              <PatientPicker
                value={data.patient_id}
                initial={patients[0] || null}
                onChange={(id) => setData('patient_id', id)}
              />
              {errors.patient_id && <p className="mt-1 text-xs text-rose-600">{errors.patient_id}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Médico</label>
              <select value={data.doctor_id} onChange={(e) => setData('doctor_id', e.target.value)} className={input}>
                <option value="">—</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Data do resultado</label>
              <input type="date" value={data.result_date} onChange={(e) => setData('result_date', e.target.value)} className={input} />
            </div>

            <div className="col-span-full">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                <span className="text-rose-500">* </span>Título
              </label>
              <input value={data.title} onChange={(e) => setData('title', e.target.value)}
                className={input} placeholder="Ex.: Hemograma completo — Laboratório Central" />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
            </div>

            <div className="col-span-full">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Descrição</label>
              <textarea value={data.description} onChange={(e) => setData('description', e.target.value)}
                rows={12} className={`${input} font-normal leading-relaxed`}
                placeholder="Valores, laudo, observações do médico…" />
              {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Arquivos do resultado
          </h2>
          <FileDrop files={files} onChange={setFiles} max={10} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          {errors['files.0'] && <p className="mt-2 text-xs text-rose-600">{errors['files.0']}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/exam-results" className="rounded-xl px-5 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </Link>
          <button type="submit" disabled={processing}
            className="rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60">
            {processing ? 'Salvando…' : 'Salvar resultado'}
          </button>
        </div>
      </form>
    </div>
  );
}
