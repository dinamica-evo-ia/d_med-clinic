<?php

/*
 * Validação em português.
 *
 * O CRM inteiro é pt-BR, mas o Laravel vinha com o locale 'en' e SEM pasta lang/ — então todo
 * erro de formulário aparecia em inglês pro médico e pra secretária ("The insurance name field
 * is required when payment type is convenio").
 *
 * Aqui estão as regras que o sistema realmente usa. Regra nova sem tradução cai no inglês —
 * se aparecer, é só acrescentar.
 */
return [
    'accepted' => 'O campo :attribute deve ser aceito.',
    'active_url' => 'O campo :attribute não é uma URL válida.',
    'after' => 'O campo :attribute deve ser uma data posterior a :date.',
    'after_or_equal' => 'O campo :attribute deve ser uma data posterior ou igual a :date.',
    'array' => 'O campo :attribute deve ser uma lista.',
    'before' => 'O campo :attribute deve ser uma data anterior a :date.',
    'boolean' => 'O campo :attribute deve ser verdadeiro ou falso.',
    'confirmed' => 'A confirmação do campo :attribute não confere.',
    'current_password' => 'A senha está incorreta.',
    'date' => 'O campo :attribute não é uma data válida.',
    'date_format' => 'O campo :attribute não corresponde ao formato :format.',
    'different' => 'Os campos :attribute e :other devem ser diferentes.',
    'digits' => 'O campo :attribute deve ter :digits dígitos.',
    'email' => 'O campo :attribute deve ser um e-mail válido.',
    'exists' => 'O :attribute selecionado é inválido.',
    'file' => 'O campo :attribute deve ser um arquivo.',
    'filled' => 'O campo :attribute é obrigatório.',
    'image' => 'O campo :attribute deve ser uma imagem.',
    'in' => 'O :attribute selecionado é inválido.',
    'integer' => 'O campo :attribute deve ser um número inteiro.',
    'max' => [
        'array' => 'O campo :attribute não pode ter mais que :max itens.',
        'file' => 'O arquivo :attribute não pode ter mais que :max kilobytes.',
        'numeric' => 'O campo :attribute não pode ser maior que :max.',
        'string' => 'O campo :attribute não pode ter mais que :max caracteres.',
    ],
    'mimes' => 'O campo :attribute deve ser um arquivo do tipo: :values.',
    'min' => [
        'array' => 'O campo :attribute deve ter pelo menos :min itens.',
        'file' => 'O arquivo :attribute deve ter pelo menos :min kilobytes.',
        'numeric' => 'O campo :attribute deve ser pelo menos :min.',
        'string' => 'O campo :attribute deve ter pelo menos :min caracteres.',
    ],
    'numeric' => 'O campo :attribute deve ser um número.',
    'required' => 'O campo :attribute é obrigatório.',
    'required_if' => 'O campo :attribute é obrigatório quando :other é :value.',
    'required_with' => 'O campo :attribute é obrigatório quando :values está presente.',
    'string' => 'O campo :attribute deve ser um texto.',
    'unique' => 'Este :attribute já está em uso.',
    'uploaded' => 'Falha no upload do :attribute.',
    'url' => 'O campo :attribute deve ser uma URL válida.',

    /*
     * Nome dos campos como o usuário os vê na tela — sem isso sairia "O campo insurance_name
     * é obrigatório", que não diz nada pra recepção.
     */
    'attributes' => [
        'name' => 'nome',
        'email' => 'e-mail',
        'password' => 'senha',
        'phone' => 'telefone',
        'document' => 'CPF',
        'birth_date' => 'data de nascimento',
        'patient_id' => 'paciente',
        'doctor_id' => 'médico',
        'starts_at' => 'início',
        'ends_at' => 'fim',
        'payment_type' => 'forma de pagamento',
        'insurance_name' => 'convênio',
        'title' => 'título',
        'description' => 'descrição',
        'notes' => 'observações',
        'result_date' => 'data do resultado',
        'files' => 'arquivos',
        'legal_name' => 'nome/razão social',
        'nature' => 'natureza',
        'city' => 'cidade',
        'state' => 'estado',
        'zip' => 'CEP',
        'street' => 'logradouro',
        'number' => 'número',
        'district' => 'bairro',
        'license_number' => 'CRM',
        'license_state' => 'UF do CRM',
        'specialty' => 'especialidade',
        'role' => 'papel',
        'status' => 'status',
        'type' => 'tipo',
    ],
];
