<?php

declare(strict_types=1);

namespace App\Middleware;

final class CompanyOnly extends RoleMiddleware
{
    protected array $allowedRoles = ['company'];
}
