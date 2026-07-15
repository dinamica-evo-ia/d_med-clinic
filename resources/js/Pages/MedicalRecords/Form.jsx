import { useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import SOAPEditor from '../../Components/MedicalRecords/SOAPEditor';
import StudioDictation from '@/Components/shared/StudioDictation';

/*
 * Anamnese e Evolução são coisas diferentes e o formulário reflete isso:
 *
 *   Anamnese  -> SOAP completo (é o documento vivo do paciente: histórico, exame físico,
 *                diagnósticos, conduta)
 *   Evolução  -> TEXTO CORRIDO. É o registro daquela consulta; o médico escreve (ou dita) e
 *                pronto. Antes as duas usavam o mesmo SOAPEditor, e preencher SOAP inteiro
 *                pra registrar um retorno de 5 minutos não fazia sentido.
 *
 * O texto da evolução mora em `notes` (a coluna text de medical_records) — que o Show já
 * renderiza com whitespace-pre-wrap.
 */
export default function Form({ patient, record, doctors, type = 'evolucao' }) {
    const isEditing = !!record?.id;
    const recType = record?.type || type || 'evolucao';
    const isEvolucao = recType !== 'anamnese';
    const typeLabel = isEvolucao ? 'Evolução' : 'Anamnese';
    const [ditando, setDitando] = useState(false);

    const { data, setData, post, put, processing, errors } = useForm({
        doctor_id: record?.doctor_id || doctors?.[0]?.id || '',
        appointment_id: record?.appointment_id || '',
        chief_complaint: record?.chief_complaint || '',
        anamnesis: record?.anamnesis || null,
        physical_exam: record?.physical_exam || null,
        diagnosis: record?.diagnosis || [],
        diagnosis_notes: '',
        prescriptions: record?.prescriptions || [],
        exam_requests: record?.exam_requests || [],
        certificates: record?.certificates || [],
        notes: record?.notes || '',
        type: recType,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            doctor_id: data.doctor_id,
            appointment_id: data.appointment_id ? data.appointment_id : null,
            chief_complaint: data.chief_complaint,
            anamnesis: data.anamnesis,
            physical_exam: data.physical_exam,
            diagnosis: data.diagnosis,
            prescriptions: data.prescriptions,
            exam_requests: data.exam_requests,
            certificates: data.certificates,
            notes: data.notes,
            type: data.type,
        };

        if (isEditing) {
            put(`/patients/${patient.id}/records/${record.id}`, payload);
        } else {
            post(`/patients/${patient.id}/records`, payload);
        }
    };

    // o ditado ACRESCENTA, não substitui: o médico pode ter começado a digitar antes
    const receberDitado = (texto) => {
        setData('notes', data.notes.trim() ? `${data.notes.trim()}\n\n${texto}` : texto);
    };

    return (
        <div className="w-full">
            <div className="mb-6">
                <Link href={`/patients/${patient.id}/records`} className="mb-2 inline-block text-sm text-blue-600 hover:text-blue-800">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? `Editar ${typeLabel}` : `Nova ${typeLabel}`} — {patient.name}
                </h1>
            </div>

            <form onSubmit={handleSubmit}>
                {!isEditing && doctors?.length > 0 && (
                    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Médico Responsável *</label>
                        <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Selecione...</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {errors.doctor_id && <p className="mt-1 text-xs text-red-500">{errors.doctor_id}</p>}
                    </div>
                )}

                {isEvolucao ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-gray-700">Evolução</label>
                            <button type="button" onClick={() => setDitando(true)}
                                className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                🎤 Gravar pelo Studio Med
                            </button>
                        </div>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                            rows={20}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-relaxed outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                            placeholder="Relato da consulta: como o paciente está, o que mudou desde a última vez, conduta…" />
                        {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
                        <p className="mt-2 text-xs text-slate-400">
                            Texto livre. Para o documento completo do paciente (histórico, exame físico,
                            diagnósticos), use a <b>Anamnese</b>.
                        </p>
                    </div>
                ) : (
                    <SOAPEditor data={data} setData={setData} errors={errors} patientId={patient.id} />
                )}

                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing}
                        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Salvando...' : isEditing ? `Atualizar ${typeLabel}` : `Salvar ${typeLabel}`}
                    </button>
                    <Link href={`/patients/${patient.id}/records`}
                        className="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                        Cancelar
                    </Link>
                </div>
            </form>

            {ditando && (
                <StudioDictation
                    patientId={patient.id}
                    onText={receberDitado}
                    onClose={() => setDitando(false)}
                />
            )}
        </div>
    );
}
