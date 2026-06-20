import { Link, usePage } from '@inertiajs/react';
import EmptyState from '../../Components/shared/EmptyState';

export default function Index({ patient, records }) {
    const { props } = usePage();
    const preselectedAppointment = props.query?.appointment_id || '';

    return (
        <div>
            <div className="mb-6">
                <Link href={`/patients/${patient.id}`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar para {patient.name}</Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Prontuário - {patient.name}</h1>
                    <Link href={`/patients/${patient.id}/records?new=true${preselectedAppointment ? `&appointment_id=${preselectedAppointment}` : ''}`}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                        + Novo Registro
                    </Link>
                </div>
            </div>

            {records.data?.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <EmptyState
                        title="Nenhum prontuário encontrado"
                        description="Registre a primeira consulta deste paciente."
                        action={
                            <Link href={`/patients/${patient.id}/records?new=true`}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                                + Novo Registro
                            </Link>
                        }
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {records.data?.map((record) => (
                        <Link key={record.id} href={`/patients/${patient.id}/records/${record.id}`}
                            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {record.doctor?.name || 'Médico não informado'}
                                        {record.origem === 'studio_med' && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">🎙️ Gravada</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(record.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                {record.appointment && (
                                    <span className="text-xs text-gray-400">
                                        Consulta: {new Date(record.appointment.starts_at).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            {record.chief_complaint && (
                                <div className="mb-2">
                                    <span className="text-xs text-gray-500 uppercase font-medium">Queixa: </span>
                                    <span className="text-sm text-gray-700">{record.chief_complaint}</span>
                                </div>
                            )}
                            {record.diagnosis && record.diagnosis.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {record.diagnosis.map((d, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                                            {d.code} - {d.description?.substring(0, 40)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
