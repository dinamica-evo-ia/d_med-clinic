import { useForm, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Form({ appointment, patients, doctors }) {
    const isEditing = !!appointment;
    const { props } = usePage();
    const preselectedPatient = props.query?.patient_id || '';

    const { data, setData, post, put, processing, errors } = useForm({
        patient_id: appointment?.patient_id || preselectedPatient || '',
        doctor_id: appointment?.doctor_id || '',
        starts_at: appointment?.starts_at?.slice(0, 16) || '',
        ends_at: appointment?.ends_at?.slice(0, 16) || '',
        type: appointment?.type || 'consultation',
        notes: appointment?.notes || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(`/appointments/${appointment.id}`);
        } else {
            post('/appointments');
        }
    };

    return (
        <div>
            <div className="mb-6">
                <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Consulta' : 'Nova Consulta'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                        <select value={data.patient_id} onChange={e => setData('patient_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Selecione...</option>
                            {patients.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} {p.phone ? `- ${p.phone}` : ''}</option>
                            ))}
                        </select>
                        {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                        <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Selecione...</option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora Início *</label>
                        <input type="datetime-local" value={data.starts_at} onChange={e => setData('starts_at', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.starts_at && <p className="text-red-500 text-xs mt-1">{errors.starts_at}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora Fim *</label>
                        <input type="datetime-local" value={data.ends_at} onChange={e => setData('ends_at', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.ends_at && <p className="text-red-500 text-xs mt-1">{errors.ends_at}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select value={data.type} onChange={e => setData('type', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="consultation">Consulta</option>
                            <option value="followup">Retorno</option>
                            <option value="exam">Exame</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Salvando...' : 'Salvar'}
                    </button>
                    <Link href="/appointments" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
