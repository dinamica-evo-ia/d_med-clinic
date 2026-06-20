<?php

use App\Models\CidCode;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

beforeEach(function () {
    $this->setUpTenant();
});

afterEach(function () {
    $this->tearDownTenant();
});

test('search returns matching CID codes', function () {
    CidCode::create([
        'code' => 'J00',
        'description' => 'Nasofaringite aguda [resfriado comum]',
        'category' => 'Doenças do aparelho respiratório',
    ]);
    CidCode::create([
        'code' => 'J01',
        'description' => 'Sinusite aguda',
        'category' => 'Doenças do aparelho respiratório',
    ]);

    $response = $this->get(route('api.cid.search', ['q' => 'J00']));

    $response->assertStatus(200);
    $response->assertJsonCount(1);
    $response->assertJsonFragment(['code' => 'J00']);
});

test('search returns empty for non-matching query', function () {
    CidCode::create([
        'code' => 'J00',
        'description' => 'Nasofaringite aguda [resfriado comum]',
        'category' => 'Doenças do aparelho respiratório',
    ]);

    $response = $this->get(route('api.cid.search', ['q' => 'ZZZZ']));

    $response->assertStatus(200);
    $response->assertJsonCount(0);
});
