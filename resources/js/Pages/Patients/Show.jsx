import { Link, router, usePage } from '@inertiajs/react';
import FileUpload from '@/Components/FileUpload';

export default function Show({ patient }) {
    const { flash } = usePage().props;
    const attachments = patient.attachments || [];

    function handleDeleteAttachment(id) {
        if (confirm('Tem certeza que deseja remover este anexo?')) {
            router.delete(`/attachments/${id}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    }

    function formatFileSize(bytes) {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    return (
        <div className="space-y-6">
            {flash?.success && (
                <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                    {flash.success}
                </div>
            )}

            <div>
                <Link href="/patients" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                    <Link href={`/patients/${patient.id}/edit`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                        Editar
                    </Link>
                </div>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Email</p>
                        <p className="text-sm text-gray-900">{patient.email || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Telefone</p>
                        <p className="text-sm text-gray-900">{patient.phone || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">CPF</p>
                        <p className="text-sm text-gray-900">{patient.document || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Data de Nascimento</p>
                        <p className="text-sm text-gray-900">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Gênero</p>
                        <p className="text-sm text-gray-900">{patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : '-'}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Link href={`/patients/${patient.id}/records`}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                    Prontuário
                </Link>
                <Link href={`/appointments/create?patient_id=${patient.id}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    Nova Consulta
                </Link>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Anexos</h2>
                </div>

                <div className="mb-4">
                    <FileUpload
                        attachableType="App\Models\Patient"
                        attachableId={patient.id}
                    />
                </div>

                {attachments.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum arquivo anexado.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {attachments.map((att) => (
                            <div key={att.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg">📎</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {att.original_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(att.size)} — {att.mime}
                                            {att.notes && ` — ${att.notes}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a href={`/attachments/${att.id}/download`}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        Download
                                    </a>
                                    <button onClick={() => handleDeleteAttachment(att.id)}
                                        className="text-sm text-red-600 hover:text-red-800 font-medium">
                                        Remover
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Appointments history */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Consultas</h2>
                {patient.appointments?.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma consulta registrada.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {patient.appointments?.map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm text-gray-900">
                                        {new Date(apt.starts_at).toLocaleDateString('pt-BR')} às {new Date(apt.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-xs text-gray-500">{apt.type === 'consultation' ? 'Consulta' : apt.type}</p>
                                </div>
                                <StatusBadge status={apt.status} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
    const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
