import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';

export default function FileUpload({ attachableType, attachableId, onUploadComplete }) {
    const [uploading, setUploading] = useState(false);
    const [notes, setNotes] = useState('');
    const [showForm, setShowForm] = useState(false);
    const fileInputRef = useRef(null);

    function handleUpload(e) {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachable_id', attachableId);
        formData.append('attachable_type', attachableType);
        formData.append('notes', notes);

        router.post('/attachments', formData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setUploading(false);
                setShowForm(false);
                setNotes('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (onUploadComplete) onUploadComplete();
            },
            onError: () => setUploading(false),
        });
    }

    if (!showForm) {
        return (
            <button type="button" onClick={() => setShowForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Adicionar Anexo
            </button>
        );
    }

    return (
        <form onSubmit={handleUpload} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Novo Anexo</span>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
            </div>
            <input type="file" ref={fileInputRef}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <input type="text" placeholder="Observações (opcional)" value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <button type="submit" disabled={uploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                {uploading ? 'Enviando...' : 'Enviar'}
            </button>
        </form>
    );
}
