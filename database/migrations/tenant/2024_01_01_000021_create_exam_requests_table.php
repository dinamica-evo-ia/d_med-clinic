<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('doctor_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('requested');
            $table->text('notes')->nullable();
            $table->date('requested_date');
            $table->date('performed_date')->nullable();
            $table->text('result')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('exam_request_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_request_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('exam_type_id')->constrained()->onDelete('cascade');
            $table->text('observation')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_request_items');
        Schema::dropIfExists('exam_requests');
    }
};
