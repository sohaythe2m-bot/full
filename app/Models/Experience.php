<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class Experience extends Model
{
    protected string $table = 'experience';
    protected array $fillable = [
        'user_id', 'company_name', 'job_title', 'employment_type',
        'start_date', 'end_date', 'is_current', 'description',
    ];
}
