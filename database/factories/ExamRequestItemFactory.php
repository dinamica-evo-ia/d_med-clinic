<?php

namespace Database\Factories;

use App\Models\ExamRequestItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExamRequestItemFactory extends Factory
{
    protected $model = ExamRequestItem::class;

    public function definition(): array
    {
        return [
            'exam_request_id' => ExamRequestFactory::new(),
            'exam_type_id' => ExamTypeFactory::new(),
            'observation' => fake()->optional()->sentence(),
        ];
    }
}
