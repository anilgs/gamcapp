<?php
declare(strict_types=1);

namespace Gamcapp\Core;

class Router {
    private array $routes = [];
    
    public function get(string $path, string $handler): void {
        $this->addRoute('GET', $path, $handler);
    }
    
    public function post(string $path, string $handler): void {
        $this->addRoute('POST', $path, $handler);
    }
    
    public function put(string $path, string $handler): void {
        $this->addRoute('PUT', $path, $handler);
    }
    
    public function delete(string $path, string $handler): void {
        $this->addRoute('DELETE', $path, $handler);
    }
    
    private function addRoute(string $method, string $path, string $handler): void {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler
        ];
    }
    
    public function run(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $this->matchPath($route['path'], $path)) {
                $this->callHandler($route['handler'], $path, $route['path']);
                return;
            }
        }
        
        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }
    
    private function matchPath(string $routePath, string $requestPath): bool {
        $routePattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
        $routePattern = str_replace('/', '\/', $routePattern);
        $routePattern = '/^' . $routePattern . '$/';
        
        return (bool) preg_match($routePattern, $requestPath);
    }
    
    private function callHandler(string $handler, string $requestPath, string $routePath): void {
        [$className, $method] = explode('@', $handler);
        
        if (!class_exists($className)) {
            http_response_code(500);
            echo json_encode(['error' => 'Controller not found']);
            return;
        }
        
        $controller = new $className();
        
        if (!method_exists($controller, $method)) {
            http_response_code(500);
            echo json_encode(['error' => 'Method not found']);
            return;
        }
        
        try {
            $params = $this->extractParams($routePath, $requestPath);
            $controller->$method($params);
        } catch (\Exception $e) {
            error_log("Controller error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Internal server error']);
        }
    }
    
    private function extractParams(string $routePath, string $requestPath): array {
        $routeParts = explode('/', $routePath);
        $requestParts = explode('/', $requestPath);
        $params = [];
        
        for ($i = 0; $i < count($routeParts); $i++) {
            if (isset($routeParts[$i]) && preg_match('/\{([^}]+)\}/', $routeParts[$i], $matches)) {
                $params[$matches[1]] = $requestParts[$i] ?? '';
            }
        }
        
        return $params;
    }
}