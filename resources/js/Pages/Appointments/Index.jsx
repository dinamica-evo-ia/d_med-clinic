import { Link } from '@inertiajs/react';
import { useState } from 'react';
import DataTable from '../../Components/shared/DataTable';

export default function Index({ appointments, doctors, filters }) {
    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);

    const columns = [
        { key: 'time', label: 'Horário', render: (row) => new Date(row.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
        { key: 'patient', label: 'Paciente', render: (row) => (
            <Link href={`/patients/${row.patient_id}`} className="text-blue-600 hover:text-blue-800 font-medium">{row.patient?.name}</Link>
        )},
        { key: 'doctor', label: 'Médico', render: (row) => row.doctor?.name, className: 'text-gray-500' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { key: 'actions', label: 'Ações', render: (row) => (
            <Link href={`/appointments/${row.id}`} className="text-blue-600 hover:text-blue-800 text-sm">Detalhes</Link>
        )},
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
                <Link href="/appointments/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    + Nova Consulta
                </Link>
            </div>

            <div className="flex gap-4 mb-4">
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <Link href={`/appointments?date=${selectedDate}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                    Filtrar
                </Link>
            </div>

            <DataTable columns={columns} data={appointments} />
        </div>
    );
}

function StatusBadge({ status }) {
    const labels = { scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou' };
    const colors = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
}
