# Acadexa Ghana - SHS Academic Management System

Full-stack academic management system for Ghana Senior High Schools under the Ghana Education Service (GES). Handles student enrollment, score management, GPA computation, attendance tracking, behavior logging, report card generation, and AI-powered academic insights.

## Project Structure

```
Acadexa-Ghana/
├── backend/           # Spring Boot REST API (Java 21, Maven)
├── frontend/          # React SPA (TypeScript, Vite, Tailwind CSS)
├── docker-compose.yml # PostgreSQL 15 + pgAdmin
├── mise.toml          # Java version management
└── README.md
```

## Prerequisites

- **Java 21** (managed via [mise](https://mise.jdx.dev/) or install manually)
- **Node.js 18+** and npm
- **Docker & Docker Compose**
- **Maven 3.8+**

## Quick Start

### 1. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in DB_PASSWORD, JWT_SECRET, etc.
```

### 2. Start the Database

```bash
docker compose up -d
```

- PostgreSQL runs on port **5433** (mapped from container port 5432)
- pgAdmin available at `http://localhost:5050` (login: `admin@shs.edu.gh` / `admin123`)
- Database: `shs_academic`, User: `shs_admin`

### 3. Start the Backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

> **Note:** If using mise-managed Java, ensure `JAVA_HOME` points to `~/.local/share/mise/installs/java/21.0.2`.

- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- Health check: `http://localhost:8080/api/health`

#### Demo Data

To seed the database with demo users and sample data:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev,demo
```

This creates demo accounts for all roles (see [Demo Credentials](#demo-credentials) below).

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173` (falls back to 5174 if taken)
- The Vite dev server proxies `/api` requests to the backend at `localhost:8080`

## User Roles

| Role | Dashboard Route | Capabilities |
|------|----------------|--------------|
| **Super Admin** | `/admin` | Full system management: schools, users, academic terms, programs, subjects, system config, AI insights, audit logs |
| **Class Teacher** | `/teacher` | Class oversight, student list, score overview, attendance, behavior logs, report card generation, early warnings |
| **Tutor** | `/tutor` | Score entry for assigned subjects, class/exam score management, student performance tracking |
| **Student** | `/student` | View results, transcripts, GPA/CGPA, attendance history, AI academic advice |
| **Parent** | `/parent` | Monitor linked student's academic performance, attendance, and behavior |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@shs.edu.gh` | `Admin@1234` |
| Class Teacher | `teacher@shs.edu.gh` | `Teacher@1234` |
| Tutor | `tutor@shs.edu.gh` | `Tutor@1234` |
| Student | `student@shs.edu.gh` | `Student@1234` |
| Parent | `parent@shs.edu.gh` | `Parent@1234` |

> Demo accounts are only available when running with the `demo` profile.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3, Zustand, TanStack React Query, React Router 7, Recharts, Radix UI, Zod |
| **Backend** | Spring Boot 3.4.3, Java 21, Spring Security 6, Spring Data JPA, JWT (jjwt 0.11.5), Bucket4j (rate limiting) |
| **Database** | PostgreSQL 15 |
| **AI** | Claude API integration for academic insights and recommendations |
| **Export** | iText 7 (PDF), Apache POI (Excel), SheetJS (frontend Excel export) |
| **Infrastructure** | Docker Compose, Maven |

## Ghana Grading System (WAEC/WASSCE)

| Grade | Grade Point | Interpretation |
|-------|------------|----------------|
| A1 | 4.0 | Excellent |
| A2 | 3.6 | Very Good |
| B2 | 3.2 | Good |
| B3 | 2.8 | Credit |
| C4 | 2.4 | Credit |
| C5 | 2.0 | Credit |
| C6 | 1.6 | Credit |
| D7 | 1.2 | Pass |
| E8 | 0.8 | Pass |
| F9 | 0.0 | Fail |

GPA is computed as the average of grade points across all subjects. Pass threshold: grade point >= 1.6 (C6).

## SHS Programs

General Science, General Arts, Business, Visual Arts, Home Economics, Agricultural Science, Technical

## API Overview

All endpoints are prefixed with `/api/v1/`. Authentication uses JWT Bearer tokens.

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/v1/auth` | Login, token refresh, password change |
| Admin | `/api/v1/admin` | School, user, term, program, subject management |
| Admin Stats | `/api/v1/admin/stats` | Dashboard statistics, grade distribution, rankings |
| Teacher | `/api/v1/teacher` | Class dashboard, students, scores, attendance, behavior, reports |
| Tutor | `/api/v1/tutor` | Score entry, class/exam scores, student performance |
| Student | `/api/v1/student` | Results, transcript, GPA, attendance |
| AI | `/api/v1/admin/ai`, `/api/v1/student/ai` | AI-powered academic insights |

Full API documentation available at Swagger UI when the backend is running.

## Security

- JWT-based stateless authentication with 24h token expiry and 7-day refresh tokens
- BCrypt password hashing (strength 12)
- Role-based access control on all endpoints
- Rate limiting via Bucket4j to prevent abuse
- CORS configured for frontend origins only
- IP validation on rate-limit headers to prevent spoofing
- Specific JWT exception handling (expired, malformed, invalid signature)
- No credentials logged in application output

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRATION` | Token expiry in ms (default: 86400000) |
| `CLAUDE_API_KEY` | Anthropic API key for AI features |
| `MAIL_USERNAME` | SMTP email address |
| `MAIL_PASSWORD` | SMTP app password |

## License

Private - All rights reserved.
