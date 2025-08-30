# AGENTS.md - Development Guidelines for GAMCAPP

## Build/Test/Lint Commands

### Frontend (React + Vite)
- **Build**: `cd frontend && npm run build`
- **Dev server**: `cd frontend && npm run dev`
- **Lint**: `cd frontend && npm run lint`
- **Type check**: `cd frontend && npm run type-check`
- **No tests configured** (add Vitest/Jest if needed)

### Backend (PHP)
- **Dev server**: `cd backend && composer serve` or `cd backend/public && php -S localhost:8000`
- **Test**: `cd backend && composer test` (PHPUnit configured)
- **Single test**: `cd backend && ./vendor/bin/phpunit tests/SpecificTest.php`
- **Dependencies**: `cd backend && composer install`

## Code Style Guidelines

### Frontend (TypeScript/React)
- **TypeScript**: Strict mode enabled, use explicit types, no `any`
- **Components**: Functional components with hooks, PascalCase naming (e.g., `UserProfile.tsx`)
- **Imports**: Absolute imports with `@/*` aliases, group by: external libs → internal components → types
- **Formatting**: ESLint enforces style, max 0 warnings allowed
- **Error Handling**: Try-catch blocks with user-friendly messages, proper error boundaries

### Backend (PHP)
- **PHP 8.1+**: Type declarations required, strict types enabled
- **Naming**: camelCase for methods/variables, PascalCase for classes, snake_case for DB columns
- **API**: JSON responses with `{success: boolean, data?: any, error?: string}` structure
- **Database**: MySQL with PDO prepared statements, UUID primary keys
- **Error Handling**: Exception handling with appropriate HTTP status codes (4xx/5xx)