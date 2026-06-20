import { Link, router } from '@inertiajs/react';

export default function Show({ appointment }) {
    const statuses = [
        { value: 'scheduled', label: 'Agendado' },
        { value: 'confirmed', label: 'Confirmar' },
        { value: 'in_progress', label: 'Iniciar' },
        { value: 'completed', label: 'Concluir' },
        { value: 'cancelled', label: 'Cancelar' },
        { value: 'no_show', label: 'Falta' },
    ];

    const updateStatus = (status) => {
        const reason = status === 'cancelled' ? prompt('Motivo do cancelamento:') : null;
        if (status === 'cancelled' && !reason) return;
        router.patch(`/appointments/${appointment.id}/status`, { status, cancellation_reason: reason });
    };

    return (
        <div>
            <div className="mb-6">
                <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">Detalhes da Consulta</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Paciente</p>
                                <p className="text-sm font-medium text-gray-900">{appointment.patient?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Médico</p>
                                <p className="text-sm font-medium text-gray-900">{appointment.doctor?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Data</p>
                                <p className="text-sm text-gray-900">{new Date(appointment.starts_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Horário</p>
                                <p className="text-sm text-gray-900">
                                    {new Date(appointment.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(appointment.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Tipo</p>
                                <p className="text-sm text-gray-900">{appointment.type === 'consultation' ? 'Consulta' : appointment.type}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Status</p>
                                <StatusBadge status={appointment.status} />
                            </div>
                        </div>
                        {appointment.notes && (
                            <div className="mt-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">Observações</p>
                                <p className="text-sm text-gray-700">{appointment.notes}</p>
                            </div>
                        )}
                    </div>

                    {appointment.medicalRecord && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Prontuário</h2>
                            <Link href={`/patients/${appointment.patient_id}/records/${appointment.medicalRecord.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver prontuário →</Link>
                        </div>
                    )}
                </div>

                {/* Status actions sidebar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Ações</h2>
                    <div className="flex flex-col gap-2">
                        {statuses.map((s) => (
                            s.value !== appointment.status && (
                                <button key={s.value} onClick={() => updateStatus(s.value)}
                                    className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 text-left">
                                    {s.label}
                                </button>
                            )
                        ))}
                    </div>
                    {appointment.status !== 'completed' && (
                        <Link href={`/patients/${appointment.patient_id}/records?appointment_id=${appointment.id}`}
                            className="mt-3 w-full block text-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                            + Prontuário
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
    const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
