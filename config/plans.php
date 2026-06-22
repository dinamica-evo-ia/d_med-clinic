<?php

/*
 * Catálogo de planos do D_Med Clinic.
 * Limites por tipo de seat (médico vs staff). null = ilimitado.
 * O campo `price` é só descritivo no MVP; cobrança vem na Fase 3.
 */
return [
    'default' => 'solo',

    'plans' => [
        'solo' => [
            'name' => 'Solo',
            'description' => 'Profissional autônomo',
            'doctors' => 1,
            'staff' => 1,
            'price' => null,
        ],
        'pro' => [
            'name' => 'Pro',
            'description' => 'Pequena clínica',
            'doctors' => 3,
            'staff' => 2,
            'price' => null,
        ],
        'clinica' => [
            'name' => 'Clínica',
            'description' => 'Clínica média',
            'doctors' => 10,
            'staff' => 5,
            'price' => null,
        ],
        'enterprise' => [
            'name' => 'Enterprise',
            'description' => 'Rede / hospital',
            'doctors' => null,
            'staff' => null,
            'price' => null,
        ],
    ],

    'statuses' => [
        'trial' => 'Em trial',
        'active' => 'Ativo',
        'past_due' => 'Inadimplente',
        'suspended' => 'Suspenso',
        'cancelled' => 'Cancelado',
    ],
];
