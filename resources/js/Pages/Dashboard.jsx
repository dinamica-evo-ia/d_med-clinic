import { Link } from '@inertiajs/react';

export default function Dashboard({ appointments, stats }) {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Consultas Hoje" value={stats.today_appointments} color="blue" />
                <StatCard title="Total de Pacientes" value={stats.total_patients} color="green" />
                <StatCard title="Contas Pendentes" value={`R$ ${Number(stats.pending_invoices).toFixed(2)}`} color="yellow" />
                <StatCard title="Concluídas Hoje" value={stats.completed_today} color="purple" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Agenda de Hoje</h2>
                    <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver todas →
                    </Link>
                </div>

                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>Nenhuma consulta agendada para hoje.</p>
                        <Link href="/appointments/create" className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium">
                            + Agendar consulta
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {appointments.map((apt) => (
                            <div key={apt.id} className="flex items-center gap-4 py-3">
                                <div className="text-sm font-medium text-gray-700 w-20">
                                    {new Date(apt.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{apt.patient?.name}</p>
                                    <p className="text-xs text-gray-500">{apt.doctor?.name}</p>
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

function StatCard({ title, value, color }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${
                color === 'blue' ? 'text-blue-700' :
                color === 'green' ? 'text-green-700' :
                color === 'yellow' ? 'text-yellow-700' :
                'text-purple-700'
            }`}>
                {value}
            </p>
        </div>
    );
}

function StatusBadge({ status }) {
    const labels = {
        scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento',
        completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou',
    };
    const colors = {
        scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
        in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
            {labels[status] || status}
        </span>
    );
}
