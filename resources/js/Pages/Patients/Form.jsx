import { useForm, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const UF = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function Field({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function Section({ title, children }) {
    return (
        <div className="border-t border-slate-100 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
        </div>
    );
}

/*
 * O atributo `capture` em <input type=file> só abre a câmera nativa em navegador MOBILE —
 * no desktop (Mac/Windows) ele é ignorado e cai no seletor de arquivo comum. Por isso "Tirar
 * foto" usa getUserMedia + <video>/<canvas> pra abrir a webcam de verdade em qualquer ambiente.
 */
function CameraModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
            .then((stream) => {
                if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(() => setError('Não foi possível acessar a câmera. Verifique a permissão do navegador.'));
        return () => {
            active = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) onCapture(new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-slate-900 aspect-video object-cover" />
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancelar</button>
                    {!error && (
                        <button type="button" onClick={capture} className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Capturar</button>
                    )}
                </div>
            </div>
        </div>
    );
}

/*
 * Editando paciente existente: upload é imediato (POST/DELETE dedicados), já tem ID pra anexar.
 * Criando paciente novo: ainda não existe ID, então a foto fica "presa" no form (data.photo)
 * com preview local e só sobe pro servidor junto com o resto do cadastro, no submit.
 */
function PhotoUploader({ patient, name, stagedFile, onStage, onUnstage }) {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    const isEditing = !!patient;

    const upload = (file) => {
        if (!file) return;
        if (isEditing) {
            setUploading(true);
            const fd = new FormData();
            fd.append('photo', file);
            router.post(`/patients/${patient.id}/photo`, fd, { forceFormData: true, preserveScroll: true, onFinish: () => setUploading(false) });
        } else {
            setPreviewUrl(URL.createObjectURL(file));
            onStage(file);
        }
    };

    const removePhoto = () => {
        if (isEditing) {
            router.delete(`/patients/${patient.id}/photo`, { preserveScroll: true });
        } else {
            setPreviewUrl(null);
            onUnstage();
        }
    };

    const currentUrl = isEditing ? patient.photo_url : previewUrl;

    return (
        <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white grid place-items-center text-xl font-bold shrink-0 overflow-hidden">
                {currentUrl ? <img src={currentUrl} alt={name} className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
                <button type="button" disabled={uploading} onClick={() => setShowCamera(true)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50">Tirar foto</button>
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50">Escolher foto</button>
                {currentUrl && (
                    <button type="button" onClick={removePhoto} className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">Remover foto</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
            {showCamera && (
                <CameraModal
                    onClose={() => setShowCamera(false)}
                    onCapture={(file) => { setShowCamera(false); upload(file); }}
                />
            )}
        </div>
    );
}

export default function Form({ patient }) {
    const isEditing = !!patient;
    const { data, setData, post, put, transform, processing, errors } = useForm({
        name: patient?.name || '',
        social_name: patient?.social_name || '',
        email: patient?.email || '',
        phone: patient?.phone || '',
        whatsapp: patient?.whatsapp || '',
        document: patient?.document || '',
        is_foreign: patient?.is_foreign || false,
        rg: patient?.rg || '',
        rg_issuer: patient?.rg_issuer || '',
        rg_state: patient?.rg_state || '',
        rg_issued_at: patient?.rg_issued_at || '',
        birth_date: patient?.birth_date || '',
        gender: patient?.gender || '',
        marital_status: patient?.marital_status || '',
        mother_name: patient?.mother_name || '',
        father_name: patient?.father_name || '',
        spouse_name: patient?.spouse_name || '',
        notes: patient?.notes || '',
        address: patient?.address || {},
        hasInsurance: !!patient?.insurance,
        insurance: patient?.insurance || {},
        emergency_contact: patient?.emergency_contact || {},
        photo: null,
    });

    const setAddr = (key, value) => setData('address', { ...data.address, [key]: value });
    const setInsurance = (key, value) => setData('insurance', { ...data.insurance, [key]: value });
    const setEmergency = (key, value) => setData('emergency_contact', { ...data.emergency_contact, [key]: value });

    const handleSubmit = (e) => {
        e.preventDefault();
        transform((formData) => {
            const { hasInsurance, ...rest } = formData;
            return { ...rest, insurance: hasInsurance ? formData.insurance : null };
        });
        if (isEditing) {
            put(`/patients/${patient.id}`);
        } else {
            post('/patients');
        }
    };

    return (
        <div>
            <div className="mb-6">
                <Link href="/patients" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar</Link>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-4xl">
                <PhotoUploader patient={patient} name={data.name} onStage={(file) => setData('photo', file)} onUnstage={() => setData('photo', null)} />

                <Section title="Informações básicas">
                    <Field label="Nome *" error={errors.name} className="md:col-span-2">
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Nome social" error={errors.social_name}>
                        <input type="text" value={data.social_name} onChange={e => setData('social_name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Data de nascimento" error={errors.birth_date}>
                        <input type="date" value={data.birth_date} onChange={e => setData('birth_date', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Sexo" error={errors.gender}>
                        <select value={data.gender} onChange={e => setData('gender', e.target.value)} className={inputCls}>
                            <option value="">Selecione</option>
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                            <option value="other">Outro</option>
                        </select>
                    </Field>
                    <Field label="Estado civil" error={errors.marital_status}>
                        <select value={data.marital_status} onChange={e => setData('marital_status', e.target.value)} className={inputCls}>
                            <option value="">Selecione</option>
                            <option value="solteiro">Solteiro(a)</option>
                            <option value="casado">Casado(a)</option>
                            <option value="divorciado">Divorciado(a)</option>
                            <option value="viuvo">Viúvo(a)</option>
                            <option value="uniao_estavel">União estável</option>
                        </select>
                    </Field>
                    <Field label="Nome da mãe" error={errors.mother_name}>
                        <input type="text" value={data.mother_name} onChange={e => setData('mother_name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Nome do pai" error={errors.father_name}>
                        <input type="text" value={data.father_name} onChange={e => setData('father_name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Cônjuge" error={errors.spouse_name}>
                        <input type="text" value={data.spouse_name} onChange={e => setData('spouse_name', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                <Section title="Documentação e identidade">
                    <Field label="CPF" error={errors.document}>
                        <input type="text" value={data.document} onChange={e => setData('document', e.target.value)} className={inputCls} />
                    </Field>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.is_foreign} onChange={e => setData('is_foreign', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            Paciente estrangeiro
                        </label>
                    </div>
                    <div />
                    <Field label="RG" error={errors.rg}>
                        <input type="text" value={data.rg} onChange={e => setData('rg', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Órgão expedidor" error={errors.rg_issuer}>
                        <input type="text" value={data.rg_issuer} onChange={e => setData('rg_issuer', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Estado (RG)" error={errors.rg_state}>
                        <select value={data.rg_state} onChange={e => setData('rg_state', e.target.value)} className={inputCls}>
                            <option value="">Selecione</option>
                            {UF.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </Field>
                    <Field label="Data de emissão" error={errors.rg_issued_at}>
                        <input type="date" value={data.rg_issued_at} onChange={e => setData('rg_issued_at', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                <Section title="Contato">
                    <Field label="Telefone" error={errors.phone}>
                        <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="WhatsApp" error={errors.whatsapp}>
                        <input type="text" value={data.whatsapp} onChange={e => setData('whatsapp', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="E-mail" error={errors.email}>
                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                <Section title="Endereço">
                    <Field label="CEP">
                        <input type="text" value={data.address.zip || ''} onChange={e => setAddr('zip', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Estado">
                        <select value={data.address.state || ''} onChange={e => setAddr('state', e.target.value)} className={inputCls}>
                            <option value="">Selecione</option>
                            {UF.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </Field>
                    <Field label="Cidade">
                        <input type="text" value={data.address.city || ''} onChange={e => setAddr('city', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Bairro">
                        <input type="text" value={data.address.neighborhood || ''} onChange={e => setAddr('neighborhood', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Endereço" className="md:col-span-2">
                        <input type="text" value={data.address.street || ''} onChange={e => setAddr('street', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Número">
                        <input type="text" value={data.address.number || ''} onChange={e => setAddr('number', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Complemento">
                        <input type="text" value={data.address.complement || ''} onChange={e => setAddr('complement', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Referência">
                        <input type="text" value={data.address.reference || ''} onChange={e => setAddr('reference', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                <Section title="Convênio">
                    <div className="md:col-span-3 -mt-2 mb-1">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.hasInsurance} onChange={e => setData('hasInsurance', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            Tem plano de saúde
                        </label>
                    </div>
                    {data.hasInsurance && (
                        <>
                            <Field label="Convênio">
                                <input type="text" value={data.insurance.name || ''} onChange={e => setInsurance('name', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Nº da carteirinha">
                                <input type="text" value={data.insurance.number || ''} onChange={e => setInsurance('number', e.target.value)} className={inputCls} />
                            </Field>
                        </>
                    )}
                </Section>

                <Section title="Contato de emergência">
                    <Field label="Nome">
                        <input type="text" value={data.emergency_contact.name || ''} onChange={e => setEmergency('name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Telefone">
                        <input type="text" value={data.emergency_contact.phone || ''} onChange={e => setEmergency('phone', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                <Section title="Observações">
                    <Field className="md:col-span-3">
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3} className={inputCls} />
                    </Field>
                </Section>

                <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={processing}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Salvando...' : 'Salvar'}
                    </button>
                    <Link href="/patients" className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
