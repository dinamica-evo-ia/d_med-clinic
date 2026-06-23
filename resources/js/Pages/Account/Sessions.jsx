import ComingSoon from '@/Components/ComingSoon';

export default function Sessions() {
  return (
    <ComingSoon
      title="Logins ativos"
      description="Ver e gerenciar todas as sessões da sua conta — navegadores, celulares e tablets onde você está logado."
      features={[
        'Lista de dispositivos com data/hora do último acesso',
        'IP e localização aproximada de cada sessão',
        'Encerrar uma sessão específica remotamente',
        'Encerrar todas as outras sessões com um clique',
      ]}
    />
  );
}
