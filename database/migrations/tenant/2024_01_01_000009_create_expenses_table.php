<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('supplier')->nullable();
            $table->text('description')->nullable();
            $table->decimal('amount', 10, 2);
            $table->foreignUuid('category_id')->nullable()->constrained('transaction_categories')->onDelete('set null');
            $table->date('due_date')->nullable();
            $table->string('payment_method')->nullable();
            $table->string('status')->default('pending'); // pending, paid, cancelled
            $table->dateTime('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
