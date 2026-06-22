import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export default function Print({ prescription }) {
    const { tenant } = usePage().props;
    const { patient, doctor, medicines, notes, created_at } = prescription;

    useEffect(() => {
        window.print();
    }, []);

    const clinicName = tenant?.name || 'D_Med Clinic';

    return (
        <div className="print-container">
            <style>{`
                @page {
                    margin: 20mm 15mm;
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
                .no-print { display: none; }
                .print-container { padding: 0; max-width: 210mm; margin: 0 auto; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 24px; }
                .header h1 { font-size: 18pt; text-transform: uppercase; letter-spacing: 1px; }
                .header p { font-size: 10pt; color: #555; }
                .title { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
                .info-table { width: 100%; margin-bottom: 24px; }
                .info-table td { padding: 4px 8px; font-size: 11pt; vertical-align: top; }
                .info-table td:first-child { width: 100px; font-weight: bold; }
                .info-line { border-bottom: 1px solid #999; min-width: 200px; display: inline-block; padding: 0 4px; }
                .medicines { margin-bottom: 24px; }
                .medicine-item { margin-bottom: 16px; padding-left: 16px; }
                .medicine-item .name { font-weight: bold; font-size: 12pt; }
                .medicine-item .details { font-size: 11pt; margin-top: 4px; }
                .medicine-item .details span { display: block; margin-left: 16px; }
                .notes-section { margin-bottom: 32px; padding-left: 16px; }
                .notes-section p { font-size: 11pt; font-style: italic; }
                .signature-area { margin-top: 48px; text-align: center; }
                .signature-line { width: 250px; border-top: 1px solid #000; margin: 0 auto 8px; padding-top: 8px; }
                .signature-area .doctor-name { font-weight: bold; font-size: 11pt; }
                .signature-area .doctor-title { font-size: 10pt; color: #555; }
                .footer { text-align: center; margin-top: 32px; font-size: 9pt; color: #888; border-top: 1px solid #ccc; padding-top: 12px; }
                .date-display { text-align: right; font-size: 11pt; margin-bottom: 16px; }
                .label-inline { font-weight: bold; }
            `}</style>

            {/* Print info bar */}
            <div className="no-print fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm z-50">
                Use Ctrl+P ou Cmd+P para imprimir. Feche esta aba após imprimir.
            </div>

            <div style={{ padding: '40px 30px', marginTop: '40px' }}>
                {/* Header */}
                <div className="header">
                    <h1>{clinicName}</h1>
                    <p>CNPJ: {tenant?.document || '00.000.000/0000-00'} | Tel: {tenant?.phone || '(00) 0000-0000'}</p>
                    <p>{tenant?.email || 'contato@medhealth.com.br'} | {tenant?.address || ''}</p>
                </div>

                {/* Title */}
                <div className="title">Receituário Médico</div>

                {/* Date */}
                <div className="date-display">
                    {new Date(created_at).toLocaleDateString('pt-BR')}
                </div>

                {/* Patient data */}
                <table className="info-table">
                    <tbody>
                        <tr>
                            <td>Paciente:</td>
                            <td><span className="info-line">{patient?.name || '___________________________'}</span></td>
                        </tr>
                        {patient?.document && (
                            <tr>
                                <td>Documento:</td>
                                <td><span className="info-line">{patient.document}</span></td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Medicines */}
                <div className="medicines">
                    <p style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '11pt' }}>Prescrevo o(s) seguinte(s) medicamento(s):</p>
                    {medicines?.map((med, i) => (
                        <div key={i} className="medicine-item">
                            <p className="name">{i + 1}. {med.medication}{med.dosage ? ` — ${med.dosage}` : ''}</p>
                            <div className="details">
                                {med.route && <span>Via: {med.route}</span>}
                                {med.frequency && <span>Frequência: {med.frequency}</span>}
                                {med.duration && <span>Duração: {med.duration}</span>}
                                {med.quantity && <span>Quantidade: {med.quantity}</span>}
                                {med.notes && <span>Obs: {med.notes}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Notes */}
                {notes && (
                    <div className="notes-section">
                        <p><span className="label-inline">Observações:</span> {notes}</p>
                    </div>
                )}

                {/* Signature */}
                <div className="signature-area">
                    <div className="signature-line">&nbsp;</div>
                    <p className="doctor-name">{doctor?.name || '___________________________'}</p>
                    <p className="doctor-title">Médico Responsável</p>
                    {doctor?.crm && <p className="doctor-title">CRM: {doctor.crm}</p>}
                </div>

                {/* Footer */}
                <div className="footer">
                    Documento válido apenas com assinatura do médico responsável.
                </div>
            </div>
        </div>
    );
}
