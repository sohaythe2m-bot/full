<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * RoleMiddleware
 *
 * Base class for role restriction. Since the Router instantiates
 * middleware with no constructor args, concrete per-role middleware
 * classes (AdminOnly, CompanyOnly, JobSeekerOnly) extend this and set
 * $allowedRoles. This keeps route registration simple:
 *
 *   $router->get('/admin/users', [...], [AuthMiddleware::class, AdminOnly::class]);
 */
abstract class RoleMiddleware
{
    /** @var string[] */
    protected array $allowedRoles = [];

    public function handle(Request $request): void
    {
        if ($request->user === null) {
            // AuthMiddleware must run before any RoleMiddleware.
            Response::unauthorized('Authentication required before role check');
        }

        if (!in_array($request->user['role'], $this->allowedRoles, true)) {
            Response::forbidden('You do not have permission to access this resource');
        }
    }
}
