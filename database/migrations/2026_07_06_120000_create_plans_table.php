<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Planos do produto (central DB — global, não por tenant). Antes viviam fixos em
 * config/plans.php; agora editáveis no Painel Master (preço, limites, serviços).
 * doctors/staff null = ilimitado. price null = sob consulta (Enterprise).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();       // solo | pro | clinica | enterprise
            $table->string('name');
            $table->string('description')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->unsignedInteger('doctors')->nullable();
            $table->unsignedInteger('staff')->nullable();
            $table->json('features')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        $rows = [
            ['key' => 'solo', 'name' => 'Solo', 'description' => 'Profissional autônomo', 'price' => 149.00, 'doctors' => 1, 'staff' => 1, 'sort' => 1,
             'features' => ['Agenda inteligente', 'Prontuário eletrônico completo', 'Studio Med · 40h de gravação/mês', 'Prescrição digital + CIDs', 'Dados isolados por clínica']],
            ['key' => 'pro', 'name' => 'Pro', 'description' => 'Pequena clínica', 'price' => 349.00, 'doctors' => 3, 'staff' => 2, 'sort' => 2,
             'features' => ['Tudo do Solo', 'Studio Med ilimitado', 'Financeiro integrado', 'Confirmação por WhatsApp', 'Relatórios clínicos e operacionais']],
            ['key' => 'clinica', 'name' => 'Clínica', 'description' => 'Clínica média', 'price' => 899.00, 'doctors' => 10, 'staff' => 5, 'sort' => 3,
             'features' => ['Tudo do Pro', 'Agenda compartilhada multi-médico', 'BI consolidado por unidade', 'Permissões por papel', 'Suporte prioritário + onboarding']],
            ['key' => 'enterprise', 'name' => 'Enterprise', 'description' => 'Rede / hospital', 'price' => null, 'doctors' => null, 'staff' => null, 'sort' => 4,
             'features' => ['10+ médicos', 'Multi-unidade', 'SSO', 'Integrações sob medida', 'Dados isolados por instituição']],
        ];
        foreach ($rows as $r) {
            DB::table('plans')->insert([
                'key' => $r['key'], 'name' => $r['name'], 'description' => $r['description'],
                'price' => $r['price'], 'doctors' => $r['doctors'], 'staff' => $r['staff'],
                'features' => json_encode($r['features']), 'sort_order' => $r['sort'],
                'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
