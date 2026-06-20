import { useForm, Link } from '@inertiajs/react';

export default function Form({ doctor }) {
    const isEditing = !!doctor;
    const { data, setData, post, put, processing, errors } = useForm({
        name: doctor?.name || '',
        email: doctor?.email || '',
        phone: doctor?.phone || '',
        specialty: doctor?.specialty || '',
        license_number: doctor?.license_number || '',
        document: doctor?.document || '',
        bio: doctor?.bio || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            put(`/doctors/${doctor.id}`);
        } else {
            post('/doctors');
        }
    };

    return (
        <div>
            <div className="mb-6">
                <Link href="/doctors" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Médico' : 'Novo Médico'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
                        <input type="text" value={data.specialty} onChange={e => setData('specialty', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
                        <input type="text" value={data.license_number} onChange={e => setData('license_number', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
                        <textarea value={data.bio} onChange={e => setData('bio', e.target.value)} rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Salvando...' : 'Salvar'}
                    </button>
                    <Link href="/doctors" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">Cancelar</Link>
                </div>
            </form>
        </div>
    );
}
