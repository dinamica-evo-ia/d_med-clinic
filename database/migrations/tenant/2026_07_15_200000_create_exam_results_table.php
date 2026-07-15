<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Resultado de exame — o que VOLTA do laboratório. É o par do exam_requests (o que a
     * clínica PEDE): dá pra ter resultado sem pedido no sistema (paciente trouxe exame de
     * fora), por isso `exam_request_id` é opcional e sem FK rígida.
     *
     * Os arquivos (PDF/imagem do laudo) vão na tabela polimórfica `attachments`.
     */
    public function up(): void
    {
        Schema::create('exam_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('patient_id');
            $table->uuid('doctor_id')->nullable();
            $table->uuid('exam_request_id')->nullable(); // quando veio de um pedido daqui
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('result_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('patient_id');
            $table->index('result_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_results');
    }
};
