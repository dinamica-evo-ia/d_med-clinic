import { useForm, Link } from '@inertiajs/react';
import SOAPEditor from '../../Components/MedicalRecords/SOAPEditor';

export default function Form({ patient, record, doctors, type = 'evolucao' }) {
    const isEditing = !!record?.id;
    const recType = record?.type || type || 'evolucao';
    const typeLabel = recType === 'anamnese' ? 'Anamnese' : 'Evolução';

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

    return (
        <div>
            <div className="mb-6">
                <Link href={`/patients/${patient.id}/records`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? `Editar ${typeLabel}` : `Nova ${typeLabel}`} — {patient.name}
                </h1>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Doctor selector (only shown when creating) */}
                {!isEditing && doctors?.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Médico Responsável *</label>
                        <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                            className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Selecione...</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                    </div>
                )}

                <SOAPEditor data={data} setData={setData} errors={errors} patientId={patient.id} />

                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Salvando...' : isEditing ? 'Atualizar Prontuário' : 'Salvar Prontuário'}
                    </button>
                    <Link href={`/patients/${patient.id}/records`}
                        className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
