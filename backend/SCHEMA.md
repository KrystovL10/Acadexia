# GES SHS Academic System — Database Schema

## Overview
- **Database**: PostgreSQL 15
- **ORM**: Hibernate 6 / Spring Data JPA
- **Tables**: 18
- **DDL Strategy**: `hibernate.ddl-auto=update` (dev), `validate` (prod)

---

## Tables

### 1. users
Primary identity table for all system accounts.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| user_id | VARCHAR | UNIQUE, NOT NULL — GES format e.g. "GES-ADM-0001" |
| first_name | VARCHAR | NOT NULL |
| last_name | VARCHAR | NOT NULL |
| email | VARCHAR | UNIQUE, NOT NULL |
| password | VARCHAR | NOT NULL (BCrypt hashed, @JsonIgnore) |
| role | VARCHAR | NOT NULL — SUPER_ADMIN, CLASS_TEACHER, TUTOR, STUDENT, PARENT |
| phone_number | VARCHAR | |
| profile_photo_url | VARCHAR | |
| is_active | BOOLEAN | NOT NULL, default true |
| is_first_login | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |
| updated_at | TIMESTAMP | NOT NULL, auto-updated |
| created_by | VARCHAR | |

**Indexes**: idx_users_user_id, idx_users_email, idx_users_role

---

### 2. schools
School profile and metadata.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| school_code | VARCHAR | UNIQUE, NOT NULL — e.g. "GES-SCH-001" |
| name | VARCHAR | NOT NULL |
| region | VARCHAR | |
| district | VARCHAR | |
| address | VARCHAR | |
| phone_number | VARCHAR | |
| email | VARCHAR | |
| motto | VARCHAR | |
| logo_url | VARCHAR | |
| headmaster_name | VARCHAR | |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Indexes**: idx_schools_school_code

---

### 3. academic_years
Academic year periods per school (e.g. "2023/2024").

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| school_id | BIGINT | FK → schools, NOT NULL |
| year_label | VARCHAR | NOT NULL |
| start_date | DATE | |
| end_date | DATE | |
| is_current | BOOLEAN | NOT NULL, default false |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Unique**: (school_id, year_label)
**Relations**: Has many → terms

---

### 4. terms
Three terms per academic year (Term 1, 2, 3).

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| term_type | VARCHAR | NOT NULL — TERM_1, TERM_2, TERM_3 |
| start_date | DATE | |
| end_date | DATE | |
| is_current | BOOLEAN | NOT NULL, default false |
| is_scores_locked | BOOLEAN | NOT NULL, default false |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Unique**: (academic_year_id, term_type)

---

### 5. programs
SHS programs offered by a school.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| program_type | VARCHAR | NOT NULL — GENERAL_SCIENCE, GENERAL_ARTS, BUSINESS, VISUAL_ARTS, HOME_ECONOMICS, AGRICULTURAL_SCIENCE, TECHNICAL |
| display_name | VARCHAR | NOT NULL |
| description | VARCHAR | |
| school_id | BIGINT | FK → schools, NOT NULL |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Unique**: (program_type, school_id)
**Relations**: Has many → program_subjects

---

### 6. subjects
Academic subjects available at a school.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| subject_code | VARCHAR | NOT NULL — e.g. "MATH-01", "PHY-01" |
| name | VARCHAR | NOT NULL |
| is_core | BOOLEAN | NOT NULL, default false |
| is_elective | BOOLEAN | NOT NULL, default false |
| school_id | BIGINT | FK → schools, NOT NULL |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Unique**: (subject_code, school_id)

---

### 7. program_subjects
Maps which subjects belong to which program, per year group.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| program_id | BIGINT | FK → programs, NOT NULL |
| subject_id | BIGINT | FK → subjects, NOT NULL |
| year_group | VARCHAR | NOT NULL — SHS1, SHS2, SHS3 |
| is_compulsory | BOOLEAN | NOT NULL, default true |

**Unique**: (program_id, subject_id, year_group)

---

### 8. classrooms
Physical/logical class groups (e.g. "SHS 1 Science A").

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| class_code | VARCHAR | NOT NULL — e.g. "SHS1-SCI-A" |
| display_name | VARCHAR | NOT NULL |
| year_group | VARCHAR | NOT NULL — SHS1, SHS2, SHS3 |
| program_id | BIGINT | FK → programs, NOT NULL |
| school_id | BIGINT | FK → schools, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| class_teacher_id | BIGINT | FK → users, nullable |
| capacity | INTEGER | NOT NULL, default 45 |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Unique**: (class_code, school_id, academic_year_id)

---

### 9. class_subject_assignments
Maps which tutor teaches which subject in which class.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| subject_id | BIGINT | FK → subjects, NOT NULL |
| tutor_id | BIGINT | FK → users, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| is_active | BOOLEAN | NOT NULL, default true |

**Unique**: (classroom_id, subject_id, academic_year_id)

---

### 10. teachers
Teacher/tutor profile linked to a user account.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| user_id | BIGINT | FK → users, UNIQUE, NOT NULL |
| staff_id | VARCHAR | UNIQUE, NOT NULL — e.g. "TCH-2024-001" |
| department | VARCHAR | |
| qualification | VARCHAR | |
| specialization | VARCHAR | |
| date_joined | DATE | |
| school_id | BIGINT | FK → schools, NOT NULL |
| is_class_teacher | BOOLEAN | NOT NULL, default false |
| assigned_class_id | BIGINT | FK → classrooms, nullable |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Indexes**: idx_teachers_staff_id, idx_teachers_school_id

---

### 11. students
Student profile linked to a user account.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| user_id | BIGINT | FK → users, UNIQUE, NOT NULL |
| student_index | VARCHAR | UNIQUE, NOT NULL — e.g. "0240123456" |
| date_of_birth | DATE | |
| gender | VARCHAR | |
| nationality | VARCHAR | NOT NULL, default "Ghanaian" |
| hometown | VARCHAR | |
| residential_address | VARCHAR | |
| guardian_name | VARCHAR | |
| guardian_phone | VARCHAR | |
| guardian_email | VARCHAR | |
| guardian_relationship | VARCHAR | |
| bece_aggregate | INTEGER | nullable — BECE score |
| bece_year | VARCHAR | nullable |
| admission_date | DATE | |
| school_id | BIGINT | FK → schools, NOT NULL |
| current_year_group | VARCHAR | NOT NULL — SHS1, SHS2, SHS3 |
| current_program_id | BIGINT | FK → programs, NOT NULL |
| current_class_id | BIGINT | FK → classrooms, nullable |
| is_active | BOOLEAN | NOT NULL, default true |
| has_graduated | BOOLEAN | NOT NULL, default false |
| created_at | TIMESTAMP | NOT NULL, auto-set |

**Indexes**: idx_students_student_index, idx_students_school_year_group

---

### 12. student_enrollments
Tracks which class a student was in for each academic year.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| year_group | VARCHAR | NOT NULL — SHS1, SHS2, SHS3 |
| enrollment_date | DATE | |
| is_repeating | BOOLEAN | NOT NULL, default false |

**Unique**: (student_id, academic_year_id)

---

### 13. scores
Individual student marks per subject per term (entered by tutors).

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| subject_id | BIGINT | FK → subjects, NOT NULL |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| term_id | BIGINT | FK → terms, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| entered_by_id | BIGINT | FK → users, NOT NULL |
| class_score | DOUBLE | nullable — max 30 (continuous assessment) |
| exam_score | DOUBLE | nullable — max 70 (end-of-term exam) |
| total_score | DOUBLE | computed: class_score + exam_score |
| grade | VARCHAR | computed: A1-F9 |
| grade_point | DOUBLE | computed: 4.0-0.0 |
| remarks | VARCHAR | computed: Excellent/Very Good/Good/Pass/Fail |
| is_absent | BOOLEAN | NOT NULL, default false |
| is_locked | BOOLEAN | NOT NULL, default false |
| submitted_at | TIMESTAMP | auto-set on insert |
| updated_at | TIMESTAMP | auto-set on update |

**Unique**: (student_id, subject_id, term_id)
**Indexes**: idx_scores_class_term_subject, idx_scores_student_term
**Auto-compute**: @PrePersist/@PreUpdate calculates total, grade, gradePoint, remarks via GradeCalculator

**Ghana A1-F9 Grading Scale**:
| Score Range | Grade | Grade Point | Remarks |
|-------------|-------|-------------|---------|
| 80-100 | A1 | 4.0 | Excellent |
| 75-79 | A2 | 3.6 | Excellent |
| 70-74 | B2 | 3.2 | Very Good |
| 65-69 | B3 | 2.8 | Very Good |
| 60-64 | C4 | 2.4 | Good |
| 55-59 | C5 | 2.0 | Good |
| 50-54 | C6 | 1.6 | Good (minimum pass) |
| 45-49 | D7 | 1.2 | Pass |
| 40-44 | E8 | 0.8 | Fail |
| 0-39 | F9 | 0.0 | Fail |

---

### 14. term_results
Computed end-of-term summary per student (GPA, position, attendance).

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| term_id | BIGINT | FK → terms, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, NOT NULL |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| year_group | VARCHAR | NOT NULL — SHS1, SHS2, SHS3 |
| total_subjects | INTEGER | |
| subjects_passed | INTEGER | |
| subjects_failed | INTEGER | |
| total_points | DOUBLE | sum of all grade points |
| gpa | DOUBLE | total_points / total_subjects (4.0 scale) |
| position_in_class | INTEGER | ranking within class |
| position_in_year_group | INTEGER | ranking within year group |
| total_students_in_class | INTEGER | |
| total_days_present | INTEGER | |
| total_days_absent | INTEGER | |
| attendance_percentage | DOUBLE | |
| conduct_rating | VARCHAR | Excellent/Very Good/Good/Fair/Poor |
| class_teacher_remarks | VARCHAR(1000) | AI-generated + teacher editable |
| headmaster_remarks | VARCHAR(1000) | nullable |
| is_generated | BOOLEAN | NOT NULL, default false |
| is_approved | BOOLEAN | NOT NULL, default false |
| generated_at | TIMESTAMP | |
| approved_at | TIMESTAMP | |

**Unique**: (student_id, term_id)
**Indexes**: idx_term_results_class_term, idx_term_results_term_gpa

---

### 15. cumulative_gpa
Running CGPA total per student across all completed terms.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, UNIQUE, NOT NULL |
| academic_year_id | BIGINT | FK → academic_years, nullable |
| total_terms_completed | INTEGER | |
| total_grade_points | DOUBLE | |
| cgpa | DOUBLE | computed: total_grade_points / total_terms_completed |
| last_updated | TIMESTAMP | auto-set |

**Auto-compute**: @PrePersist/@PreUpdate calculates cgpa

---

### 16. attendance
Daily attendance records per student.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| term_id | BIGINT | FK → terms, NOT NULL |
| date | DATE | NOT NULL |
| is_present | BOOLEAN | NOT NULL |
| is_late | BOOLEAN | NOT NULL, default false |
| reason | VARCHAR | nullable — reason for absence |
| marked_by_id | BIGINT | FK → users, NOT NULL |
| marked_at | TIMESTAMP | auto-set |

**Unique**: (student_id, date)
**Indexes**: idx_attendance_class_date, idx_attendance_student_term

---

### 17. behavior_logs
Behavioral records (discipline, achievements, commendations).

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| classroom_id | BIGINT | FK → classrooms, NOT NULL |
| term_id | BIGINT | FK → terms, NOT NULL |
| log_type | VARCHAR | NOT NULL — DISCIPLINE_ISSUE, ACHIEVEMENT, COMMENDATION, WARNING, NOTE |
| title | VARCHAR | NOT NULL |
| description | VARCHAR(2000) | |
| severity | VARCHAR | nullable — LOW, MEDIUM, HIGH |
| logged_by_id | BIGINT | FK → users, NOT NULL |
| logged_at | TIMESTAMP | auto-set |

**Indexes**: idx_behavior_logs_student_term, idx_behavior_logs_class_term

---

### 18. early_warnings
AI-generated early warning alerts for at-risk students.

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK, auto-increment |
| student_id | BIGINT | FK → students, NOT NULL |
| term_id | BIGINT | FK → terms, NOT NULL |
| warning_level | VARCHAR | NOT NULL — LOW, MEDIUM, HIGH, CRITICAL |
| warning_type | VARCHAR | NOT NULL — FAILING_MULTIPLE_SUBJECTS, GPA_DECLINE, ATTENDANCE_ISSUE, CONSECUTIVE_DECLINE, BEHAVIORAL_CONCERN |
| description | VARCHAR(2000) | AI-generated summary |
| suggested_action | VARCHAR(2000) | AI-generated recommendation |
| subjects_failing | VARCHAR | comma-separated subject names |
| previous_gpa | DOUBLE | nullable |
| current_gpa | DOUBLE | nullable |
| attendance_percentage | DOUBLE | nullable |
| is_resolved | BOOLEAN | NOT NULL, default false |
| resolved_at | TIMESTAMP | nullable |
| resolved_by_id | BIGINT | FK → users, nullable |
| resolution_note | VARCHAR(1000) | nullable |
| generated_at | TIMESTAMP | auto-set |
| is_ai_generated | BOOLEAN | NOT NULL, default true |

**Indexes**: idx_early_warnings_student, idx_early_warnings_term_level

---

## Entity Relationship Diagram (Text)

```
users ─────────────────────────────────────────────────────────────
  │ 1:1                    │ 1:1                │ referenced by
  ▼                        ▼                    ▼
students                 teachers             scores.entered_by
  │                        │                   attendance.marked_by
  │ N:1                    │ N:1               behavior_logs.logged_by
  ├──→ schools             ├──→ schools        early_warnings.resolved_by
  ├──→ programs            ├──→ classrooms     classrooms.class_teacher
  ├──→ classrooms               (assigned)     class_subject_assignments.tutor
  │
  │ referenced by
  ├──◄ scores
  ├──◄ student_enrollments
  ├──◄ term_results
  ├──◄ cumulative_gpa
  ├──◄ attendance
  ├──◄ behavior_logs
  └──◄ early_warnings

schools ──────────────────
  │ referenced by
  ├──◄ academic_years
  ├──◄ programs
  ├──◄ subjects
  ├──◄ classrooms
  ├──◄ students
  └──◄ teachers

academic_years ───────────
  │ 1:N
  ├──→ terms
  │ referenced by
  ├──◄ classrooms
  ├──◄ class_subject_assignments
  ├──◄ student_enrollments
  ├──◄ scores
  ├──◄ term_results
  └──◄ cumulative_gpa

programs ─────────────────
  │ 1:N
  ├──→ program_subjects
  │ referenced by
  ├──◄ classrooms
  └──◄ students

subjects ─────────────────
  │ referenced by
  ├──◄ program_subjects
  ├──◄ class_subject_assignments
  └──◄ scores

classrooms ───────────────
  │ referenced by
  ├──◄ class_subject_assignments
  ├──◄ students (current_class)
  ├──◄ student_enrollments
  ├──◄ teachers (assigned_class)
  ├──◄ scores
  ├──◄ term_results
  ├──◄ attendance
  └──◄ behavior_logs

terms ────────────────────
  │ referenced by
  ├──◄ scores
  ├──◄ term_results
  ├──◄ attendance
  ├──◄ behavior_logs
  └──◄ early_warnings
```

## Enums

| Enum | Values |
|------|--------|
| UserRole | SUPER_ADMIN, CLASS_TEACHER, TUTOR, STUDENT, PARENT |
| ProgramType | GENERAL_SCIENCE, GENERAL_ARTS, BUSINESS, VISUAL_ARTS, HOME_ECONOMICS, AGRICULTURAL_SCIENCE, TECHNICAL |
| YearGroup | SHS1, SHS2, SHS3 |
| TermType | TERM_1, TERM_2, TERM_3 |
| GradeValue | A1, A2, B2, B3, C4, C5, C6, D7, E8, F9 |
| WarningLevel | LOW, MEDIUM, HIGH, CRITICAL |

## Seeded Data (on first startup)

- 1 default school ("Default SHS", code "GES-SCH-001")
- 25 subjects (4 core + 21 elective)
- 6 programs with subject mappings
- 126 program-subject entries (each subject × 3 year groups)
