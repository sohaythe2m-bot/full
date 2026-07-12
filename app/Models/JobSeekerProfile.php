<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

final class JobSeekerProfile extends Model
{
    protected string $table = 'job_seeker_profiles';
    protected array $fillable = [
        'user_id', 'headline', 'bio', 'location', 'github_url',
        'linkedin_url', 'portfolio_url', 'resume_url', 'languages',
        'open_to_work', 'expected_salary_min', 'expected_salary_max',
        'preferred_job_type',
    ];

    public function findByUserId(int $userId): ?array
    {
        return $this->findBy('user_id', $userId);
    }
}
