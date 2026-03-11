# Acadexa Ghana - Backend API

Spring Boot REST API for the Ghana SHS Academic Management System.

## Tech Stack

- **Java 21** with Spring Boot 3.4.3
- **Spring Security 6** with JWT authentication (stateless)
- **Spring Data JPA** with PostgreSQL 15
- **Swagger/OpenAPI** via Springdoc 2.3.0
- **Rate Limiting** via Bucket4j 8.7.0
- **PDF Generation** via iText 7.2.5
- **Excel Export** via Apache POI 5.2.5
- **AI Integration** via Claude API (OkHttp client)
- **Lombok 1.18.36** for boilerplate reduction

## Prerequisites

- Java 21 (`JAVA_HOME` must point to a JDK 21 installation)
- Maven 3.8+
- Docker & Docker Compose (for PostgreSQL)

## Setup

### 1. Start the database

```bash
# From project root
docker compose up -d
```

PostgreSQL on port **5433**, pgAdmin on port **5050**.

### 2. Configure environment

```bash
cp .env .env.local
```

Edit `.env` with your actual database credentials, JWT secret, mail config, and Claude API key.

### 3. Run the application

```bash
# Development
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Development with demo data
mvn spring-boot:run -Dspring-boot.run.profiles=dev,demo

# Production (uses environment variables)
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### 4. Access

- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- Health: `http://localhost:8080/api/health`

## Project Structure

```
src/main/java/com/shs/academic/
├── config/          # Security, JWT, CORS, OpenAPI, rate limiting
├── controller/      # REST API endpoints (19 controllers)
├── service/         # Business logic layer
├── repository/      # Spring Data JPA repositories
├── model/
│   ├── entity/      # JPA entities
│   ├── dto/         # Request/response DTOs
│   └── enums/       # UserRole, ProgramType, GradeValue, etc.
├── exception/       # GlobalExceptionHandler (404/401/409/400/403/500)
├── security/        # JWT filter, auth entry point
├── seeder/          # Admin seeder, demo data seeder
└── util/            # JWT utility, GPA calculator, response helpers
```

## Key Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | 8080 | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5433/shs_academic` | Database URL |
| `jwt.secret` | (configured in .env) | JWT signing key |
| `jwt.expiration` | 86400000 (24h) | Access token TTL |
| `jwt.refresh-expiration` | 604800000 (7d) | Refresh token TTL |
| `cors.allowed-origins` | `http://localhost:5173,http://localhost:5174` | Allowed CORS origins |

## Profiles

- **dev**: Debug logging, relaxed settings, extra CORS origin (:3000)
- **demo**: Seeds demo users and sample academic data
- **prod**: Uses environment variables for all sensitive config

## Security Features

- JWT Bearer authentication with specific exception handling
- BCrypt password hashing (strength 12)
- Rate limiting per IP address with X-Forwarded-For validation
- CORS with trimmed, validated origins
- CSRF disabled (stateless API)
- No credentials in log output
- Null-safe DTO mapping to prevent NPEs
