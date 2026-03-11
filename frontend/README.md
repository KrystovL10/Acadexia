# Acadexa Ghana - Frontend

React single-page application for the Ghana SHS Academic Management System.

## Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 7** build tool with SWC
- **Tailwind CSS 3** with Ghana GES theme (primary green #1B6B3A, gold accent #FCD116)
- **React Router 7** with role-based routing and protected routes
- **Zustand 5** for state management (auth store with localStorage persistence)
- **TanStack React Query 5** for server state and caching
- **Axios** with JWT Bearer token interceptor and 401 redirect
- **Radix UI** + CVA for accessible component primitives
- **Recharts 3** for data visualization
- **Zod 4** for form validation
- **SheetJS (XLSX)** for client-side Excel export
- **Sonner** + custom Radix toast for notifications

## Setup

```bash
npm install
npm run dev
```

- Dev server: `http://localhost:5173` (falls back to 5174)
- API proxy: `/api` requests are forwarded to `http://localhost:8080`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── api/             # Axios instance, API client functions
├── components/
│   ├── common/      # Layout components (PageHeader, Button, ErrorBoundary)
│   └── ui/          # Radix-based UI primitives (Toast, Spinner, etc.)
├── hooks/           # React Query hooks organized by role (admin, teacher, tutor, student)
├── lib/             # Utilities (theme, queryClient, cn helper)
├── pages/
│   ├── admin/       # Super Admin dashboard and management pages
│   ├── teacher/     # Class Teacher dashboard, students, scores, attendance, reports
│   ├── tutor/       # Tutor score entry pages
│   ├── student/     # Student results and transcript pages
│   └── parent/      # Parent monitoring pages
├── router/          # AppRouter with role-based ProtectedRoute
├── store/           # Zustand stores (auth, school, teacher)
├── types/           # TypeScript type definitions matching backend DTOs
├── App.tsx          # Root component with providers and ErrorBoundary
└── main.tsx         # Entry point
```

## Role-Based Routing

| Role | Route Prefix | Dashboard |
|------|-------------|-----------|
| Super Admin | `/admin` | System overview, stats, management |
| Class Teacher | `/teacher` | Class dashboard, score overview, attendance, reports |
| Tutor | `/tutor` | Score entry, student performance |
| Student | `/student` | Results, transcript, GPA |
| Parent | `/parent` | Child's academic monitoring |

## TypeScript Notes

- `erasableSyntaxOnly` is enabled in tsconfig -- use `const` objects instead of TypeScript `enum` keyword
- Type definitions in `src/types/` mirror backend DTOs
- Strict mode enabled
