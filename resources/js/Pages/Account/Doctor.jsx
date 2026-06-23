import ComingSoon from '@/Components/ComingSoon';

export default function Doctor() {
  return (
    <ComingSoon
      title="Editar médico e clínica"
      description="Cadastro completo dos dados do médico (CRM, RQE, especialidades) e da clínica (razão social, CNPJ, endereço, logo)."
      features={[
        'Dados do médico: CRM, UF, RQE, especialidades, foto',
        'Dados da clínica: nome, CNPJ, endereço, telefone, e-mail',
        'Logo da clínica (aparece nas impressões e na sidebar)',
        'Horário de funcionamento padrão',
      ]}
    />
  );
}
