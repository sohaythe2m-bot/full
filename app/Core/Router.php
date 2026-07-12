<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    private array $routes = [];

    private string $groupPrefix = '';
    private array $groupMiddleware = [];

    /**
     * Route Group
     */
    public function group(string $prefix, array $middleware, callable $callback): void
    {
        $previousPrefix = $this->groupPrefix;
        $previousMiddleware = $this->groupMiddleware;

        // 🔥 FIX: safe normalization (no double slash ever)
        $cleanPrefix = '/' . trim($prefix, '/');

        $this->groupPrefix = rtrim($previousPrefix, '/') . $cleanPrefix;
        $this->groupPrefix = '/' . trim($this->groupPrefix, '/');

        $this->groupMiddleware = array_merge($this->groupMiddleware, $middleware);

        $callback($this);

        $this->groupPrefix = $previousPrefix;
        $this->groupMiddleware = $previousMiddleware;
    }

    public function get(string $path, array $action, array $middleware = []): void
    {
        $this->add('GET', $path, $action, $middleware);
    }

    public function post(string $path, array $action, array $middleware = []): void
    {
        $this->add('POST', $path, $action, $middleware);
    }

    public function put(string $path, array $action, array $middleware = []): void
    {
        $this->add('PUT', $path, $action, $middleware);
    }

    public function delete(string $path, array $action, array $middleware = []): void
    {
        $this->add('DELETE', $path, $action, $middleware);
    }

    /**
     * Register route
     */
    private function add(string $method, string $path, array $action, array $middleware): void
    {
        $path = '/' . trim($path, '/');

        $fullPath = rtrim($this->groupPrefix, '/') . $path;
        $fullPath = '/' . trim($fullPath, '/');

        $this->routes[] = [
            'method'     => $method,
            'path'       => $fullPath,
            'action'     => $action,
            'middleware' => array_merge($this->groupMiddleware, $middleware),
        ];

        error_log("ROUTE REGISTERED: {$method} {$fullPath}");
    }

    /**
     * Dispatch request
     */
    public function dispatch(string $method, string $uri): void
    {
        $uri = parse_url($uri, PHP_URL_PATH) ?? '/';
        $uri = '/' . trim($uri, '/');

        error_log("REQUEST: {$method} {$uri}");

        foreach ($this->routes as $route) {

            if ($route['method'] !== $method) {
                continue;
            }

            // convert {id} to regex
            $pattern = preg_replace(
                '#\{[a-zA-Z_][a-zA-Z0-9_]*\}#',
                '([a-zA-Z0-9_\-]+)',
                $route['path']
            );

            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {

                array_shift($matches);
                $params = array_values($matches);

                $request = new Request();

                // middleware pipeline
                foreach ($route['middleware'] as $middlewareClass) {
                    $mw = new $middlewareClass();
                    $mw->handle($request);
                }

                [$controllerClass, $methodName] = $route['action'];

                $controller = new $controllerClass();

                // 🔥 FIX: strict void-safe execution
                $result = $controller->$methodName($request, ...$params);

                // optional safety (prevents accidental echo issues)
                if ($result !== null) {
                    return;
                }

                return;
            }
        }

        Response::notFound('Route not found');
    }

    /**
     * Debug helper
     */
    public function debugRoutes(): array
    {
        return $this->routes;
    }
}