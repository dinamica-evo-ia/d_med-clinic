<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anamnese_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('doctor_id')->index();
            $table->string('name');
            $table->text('description')->nullable();
            // fields: array de { key, label, hint? }. key vira o nome usado no
            // input_schema do Claude tool no EVO. Ex.:
            // [
            //   { "key": "queixa_principal", "label": "Queixa principal" },
            //   { "key": "acuidade_visual", "label": "Acuidade visual", "hint": "..." }
            // ]
            $table->json('fields');
            $table->boolean('is_default')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anamnese_templates');
    }
};
