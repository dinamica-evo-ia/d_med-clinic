import ComingSoon from '@/Components/ComingSoon';

export default function Referral() {
  return (
    <ComingSoon
      title="Indique um colega"
      description="Indique outros médicos para o D_Med Clinic e ganhe benefícios quando eles assinarem."
      features={[
        'Seu link de indicação único',
        'Acompanhamento de indicações enviadas e convertidas',
        'Recompensa em desconto na mensalidade (a definir)',
        'Compartilhar por WhatsApp, e-mail ou copiar o link',
      ]}
    />
  );
}
