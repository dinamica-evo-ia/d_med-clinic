import ComingSoon from '@/Components/ComingSoon';

export default function Certificate() {
  return (
    <ComingSoon
      title="Certificado Digital (assinatura)"
      description="Upload do certificado digital ICP-Brasil (A1/.pfx) para assinar prontuários, receitas e atestados eletronicamente, com validade jurídica."
      features={[
        'Upload do arquivo .pfx (A1) com senha — armazenado criptografado',
        'Validação automática (ICP-Brasil, expira em)',
        'Assinatura em PDF (prontuário, receita, atestado, exame)',
        'Carimbo de tempo (timestamp)',
        'Suporte futuro a A3 (token/cartão)',
      ]}
      back="/account/settings/doctor"
    />
  );
}
