import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export default function Print({ examRequest }) {
    const { tenant } = usePage().props;
    const { patient, doctor, items, notes, requested_date } = examRequest;

    useEffect(() => { window.print(); }, []);

    const clinicName = tenant?.name || 'MedHealth Clínica';

    return (
        <div className="print-container">
            <style>{`
                @page { margin: 20mm 15mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
                .no-print { display: none; }
                .print-container { padding: 0; max-width: 210mm; margin: 0 auto; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 24px; }
                .header h1 { font-size: 18pt; text-transform: uppercase; letter-spacing: 1px; }
                .header p { font-size: 10pt; color: #555; }
                .title { text-align: center; font-size: 15pt; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
                .patient-line { font-weight: bold; margin-bottom: 16px; }
                .exam-list { margin-bottom: 24px; }
                .exam-list li { margin-bottom: 8px; padding-left: 8px; }
                .signature-area { margin-top: 48px; text-align: center; }
                .signature-line { width: 250px; border-top: 1px solid #000; margin: 0 auto 8px; padding-top: 8px; }
                .signature-area .doctor-name { font-weight: bold; font-size: 11pt; }
                .signature-area .doctor-title { font-size: 10pt; color: #555; }
                .footer { text-align: center; margin-top: 32px; font-size: 9pt; color: #888; border-top: 1px solid #ccc; padding-top: 12px; }
                .date-display { text-align: right; font-size: 11pt; margin-bottom: 16px; }
            `}</style>

            <div className="no-print fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm z-50">
                Use Ctrl+P ou Cmd+P para imprimir.
            </div>

            <div style={{ padding: '40px 30px', marginTop: '40px' }}>
                <div className="header">
                    <h1>{clinicName}</h1>
                    <p>CNPJ: {tenant?.document || '00.000.000/0000-00'}</p>
                </div>

                <div className="title">Pedido de Exames</div>

                <div className="date-display">{new Date(requested_date).toLocaleDateString('pt-BR')}</div>

                <p className="patient-line">Paciente: {patient?.name}</p>

                <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>Exames solicitados:</p>
                <ul className="exam-list">
                    {items?.map((item, i) => (
                        <li key={item.id}>
                            <strong>{item.exam_type?.code}</strong> — {item.exam_type?.name}
                            {item.observation && <p style={{ fontSize: '10pt', color: '#666', marginLeft: '16px' }}>Obs: {item.observation}</p>}
                        </li>
                    ))}
                </ul>

                {notes && (
                    <p style={{ marginBottom: '16px', fontStyle: 'italic', fontSize: '11pt' }}>
                        {notes}
                    </p>
                )}

                <div className="signature-area">
                    <div className="signature-line">&nbsp;</div>
                    <p className="doctor-name">{doctor?.name || '___________________________'}</p>
                    <p className="doctor-title">Médico Responsável</p>
                    {doctor?.crm && <p className="doctor-title">CRM: {doctor.crm}</p>}
                </div>

                <div className="footer">Documento válido apenas com assinatura do médico responsável.</div>
            </div>
        </div>
    );
}
