# AGENTS.md - Development Guidelines for GAMCAPP

## Build/Test/Lint Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Lint: `npm run lint` 
- Type check: `npm run type-check`
- No test framework configured (add tests to package.json if needed)

## Code Style Guidelines
- **Mixed JS/TS**: Backend uses `.js`, frontend uses `.tsx`
- **Imports**: Use `@/` alias for project root, `require()` in backend JS, `import` in TS/TSX
- **Naming**: camelCase for variables/functions, snake_case for database fields, PascalCase for components
- **Error handling**: Always use try-catch, return structured `{success, error, data}` API responses
- **Types**: Enable strict mode, use TypeScript types for React components and API interfaces
- **Database**: PostgreSQL with manual queries, models in `lib/models/`
- **Auth**: JWT tokens, middleware wrappers `requireAuth()` and `requireAdminAuth()`
- **API routes**: Use Next.js API routes pattern with HTTP method validation
- **Console logging**: Use `console.log/error` for debugging and error tracking

## Key Libraries
- Next.js 14, React 18, TypeScript, PostgreSQL (pg), Razorpay, Nodemailer, JWT, bcryptjs, Tailwind CSS

## File Structure
- API routes: `pages/api/`
- Components: `components/`
- Utilities: `lib/`
- Models: `lib/models/`
- Styles: `styles/globals.css` (Tailwind)