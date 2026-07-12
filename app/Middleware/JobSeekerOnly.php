<?php

declare(strict_types=1);

namespace App\Middleware;

final class JobSeekerOnly extends RoleMiddleware
{
    protected array $allowedRoles = ['job_seeker'];
}
