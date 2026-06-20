<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cid_codes', function (Blueprint $table) {
            $table->string('code', 10)->primary();
            $table->string('description', 500);
            $table->string('chapter', 200)->nullable();
            $table->string('category', 200)->nullable();
            $table->timestamps();

            $table->index(['code', 'description']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cid_codes');
    }
};
