<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class Education extends Model
{
    protected string $table = 'education';
    protected array $fillable = [
        'user_id', 'institution', 'degree', 'field_of_study',
        'start_date', 'end_date', 'is_current', 'description',
    ];
}
