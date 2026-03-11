# GES SHS Academic System — QA Test Plan

> Comprehensive manual QA test plan covering all critical user flows.
> **Environment**: Backend http://localhost:8080 · Frontend http://localhost:5173
> **Database**: PostgreSQL 15 on port 5433 via Docker

---

## Prerequisites

- Docker running (PostgreSQL + pgAdmin)
- Backend running: `cd backend && JAVA_HOME=$HOME/.local/share/mise/installs/java/21.0.2 mvn spring-boot:run`
- Frontend running: `cd frontend && npm run dev`
- Seeded admin: `admin@shs.edu.gh` / `Admin@1234`

---

## FLOW 1: Initial Setup (Super Admin)

### Step 1.1 — First Login
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to http://localhost:5173/login | Login page renders with GES SHS Academic System title |
| 2 | Enter email: `admin@shs.edu.gh` | Email input accepts value |
| 3 | Enter password: `Admin@1234` | Password input masks characters |
| 4 | Click "Sign In" | Loading spinner appears on button |
| 5 | Wait for redirect | Redirected to `/change-password` |
| 6 | Verify banner | "This is your first login" banner visible |

### Step 1.2 — Change Password
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Enter current password: `Admin@1234` | Field accepts value |
| 2 | Enter new password: `NewAdmin@2024` | Field accepts value |
| 3 | Enter confirm password: `NewAdmin@2024` | Field accepts value |
| 4 | Click "Change Password" | Success toast appears |
| 5 | Wait for redirect | Redirected to `/admin` (admin dashboard) |
| 6 | Verify dashboard | Dashboard loads with empty state / seeded data cards |

### Step 1.3 — Verify Password Change Persistence
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Logout (click user avatar → Logout) | Redirected to `/login` |
| 2 | Login with old password `Admin@1234` | Error: "Invalid email or password" |
| 3 | Login with new password `NewAdmin@2024` | Success — redirected to `/admin` |
| 4 | Verify no change-password redirect | Dashboard loads directly |

### Step 1.4 — Academic Structure Setup
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Academic Structure | Academic structure page loads |
| 2 | Verify seeded school profile | Demo Senior High School visible |
| 3 | Update school name to "Achimota School" | **POST** `/api/v1/admin/school` → success toast |
| 4 | Verify header updates | School name in sidebar/header changes |

#### Academic Year & Terms
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Verify seeded academic year "2024/2025" | Year appears with CURRENT badge |
| 2 | Verify Term 1 exists and is current | Term 1 shows CURRENT badge + "Scores Open" |
| 3 | Verify Term 2, Term 3 also exist | All 3 terms listed |

#### Programs
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Programs tab | Seeded programs visible |
| 2 | Verify General Science exists | Program listed with Physics, Chemistry, Biology, Elective Math + core subjects |
| 3 | Verify General Arts exists | Program listed with Literature, Government, Economics, etc. |
| 4 | Verify Business exists | Program listed with Business Management, Accounting, etc. |
| 5 | Click program → view subjects | All seeded subjects shown (core + elective) |

#### Classes
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Classes | Class management page loads |
| 2 | Create class: "SHS 2 Science A" | **POST** `/api/v1/admin/classrooms` |
|   | — Year Group: SHS2 | |
|   | — Program: General Science | |
|   | — Capacity: 35 | → Class created, appears in grid |
| 3 | Create class: "SHS 2 Arts B" | |
|   | — Year Group: SHS2 | |
|   | — Program: General Arts | |
|   | — Capacity: 30 | → Class created |
| 4 | Create class: "SHS 1 Business A" | |
|   | — Year Group: SHS1 | |
|   | — Program: Business | |
|   | — Capacity: 40 | → Class created |
| 5 | Verify all 3 classes in grid | All visible with correct year group and program badges |

---

## FLOW 2: Teacher Management

### Step 2.1 — Create Class Teacher
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Manage Teachers → Add Teacher | Teacher creation form loads |
| 2 | Fill: firstName=John, lastName=Mensah | |
| 3 | Fill: email=john.mensah@shs.edu.gh | |
| 4 | Fill: staffId=STAFF-001 | |
| 5 | Fill: department=Science, qualification=B.Ed Physics | |
| 6 | Submit teacher creation | **POST** `/api/v1/admin/users/teachers` → 201 Created |
| 7 | Assign as class teacher to "SHS 2 Science A" | **POST** `/api/v1/admin/users/teachers/assign-class` |
| 8 | Verify teacher role updated | Role shows CLASS_TEACHER |
| 9 | Navigate to class detail for SHS 2 Science A | Class teacher shows "John Mensah" |

### Step 2.2 — Create Subject Tutors
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Create tutor: Abena Owusu | |
|   | — email: abena.owusu@shs.edu.gh | |
|   | — staffId: STAFF-002, department: Science | **POST** teachers → 201 |
| 2 | Assign Abena to Chemistry in SHS 2 Science A | **POST** `/api/v1/admin/users/teachers/assign-tutor` |
|   | — teacherId, classRoomId, subjectId | → Assignment saved |
| 3 | Create tutor: Kofi Asante | |
|   | — email: kofi.asante@shs.edu.gh | |
|   | — staffId: STAFF-003, department: Mathematics | **POST** teachers → 201 |
| 4 | Assign Kofi to Mathematics in SHS 2 Science A | Assignment saved |
| 5 | Assign Kofi to Mathematics in SHS 2 Arts B | Second assignment saved (multi-class tutor) |
| 6 | Navigate to SHS 2 Science A detail | Chemistry=Abena Owusu, Mathematics=Kofi Asante visible |

### Step 2.3 — Verify Teacher Default Password
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Logout as admin | Redirected to login |
| 2 | Login: abena.owusu@shs.edu.gh / STAFF-002 | Default password = staffId |
| 3 | Verify change-password redirect | First login → `/change-password` |
| 4 | Change password, verify tutor dashboard loads | Tutor dashboard with Chemistry assignment visible |

---

## FLOW 3: Student Management

### Step 3.1 — Enroll Students (as Admin)
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Manage Students → Add Student | Student creation form |
| 2 | Create Student 1: | **POST** `/api/v1/admin/users/students` |
|   | — Kwame Boateng, Index: 0240001 | |
|   | — Program: General Science, Class: SHS 2 Science A | → 201 Created |
| 3 | Create Student 2: | |
|   | — Ama Sarpong, Index: 0240002 | → 201 Created |
| 4 | Create Student 3: | |
|   | — Kojo Asare, Index: 0240003 | → 201 Created |
| 5 | Create Student 4: | |
|   | — Akosua Frimpong, Index: 0240004 | → 201 Created |
| 6 | Create Student 5: | |
|   | — Yaw Darko, Index: 0240005 | → 201 Created |
| 7 | Verify Manage Students list | All 5 students listed in SHS 2 Science A |
| 8 | Verify student count on class card | SHS 2 Science A shows "5 students" |

### Step 3.2 — Verify Student Account
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Logout as admin | |
| 2 | Login as student (email generated at creation, password = index: 0240001) | Redirected to `/change-password` |
| 3 | Change password to: `Student@2024` | Success toast |
| 4 | Verify student dashboard loads | `/student/dashboard` |
| 5 | Verify "no results" empty state | "Your term results will appear here" with Results Pending badge |
| 6 | Verify student profile | Name, index, class, program all correct |
| 7 | Logout | |

---

## FLOW 4: Score Entry (Tutor)

### Step 4.1 — Login as Chemistry Tutor
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login: abena.owusu@shs.edu.gh / (changed password) | Tutor dashboard loads |
| 2 | Verify Chemistry assignment visible | "Chemistry — SHS 2 Science A" in sidebar |
| 3 | Verify completion: "0/5 submitted (0%)" | Progress bar at 0% |
| 4 | Click assignment | Score sheet loads with 5 student rows |

### Step 4.2 — Enter Scores
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Enter Kwame: Class=28, Exam=65 | |
|   | → Total=93, Grade=A1, Remarks=Excellent | Auto-calculated, row saves on blur |
| 2 | Enter Ama: Class=22, Exam=53 | |
|   | → Total=75, Grade=A2, Remarks=Excellent | Row auto-saves |
| 3 | Enter Kojo: Class=18, Exam=45 | |
|   | → Total=63, Grade=C4, Remarks=Good | Row auto-saves |
| 4 | Enter Akosua: Class=25, Exam=60 | |
|   | → Total=85, Grade=A1, Remarks=Excellent | Row auto-saves |
| 5 | Enter Yaw: Class=10, Exam=30 | |
|   | → Total=40, Grade=E8, Remarks=Fail | Row auto-saves |
| 6 | Verify completion reaches 100% (5/5) | Progress bar fills to 100%, "Complete" badge |
| 7 | Verify summary footer | Average, Highest (93), Lowest (40), Pass Rate shown |
| 8 | Verify pass rate | 4/5 = 80% (Yaw fails with E8) |

#### Grade Verification Table
| Student | Class | Exam | Total | Grade | Points | Remarks | Pass? |
|---------|-------|------|-------|-------|--------|---------|-------|
| Kwame Boateng | 28 | 65 | 93 | A1 | 4.0 | Excellent | Yes |
| Ama Sarpong | 22 | 53 | 75 | A2 | 3.6 | Excellent | Yes |
| Kojo Asare | 18 | 45 | 63 | C4 | 2.4 | Good | Yes |
| Akosua Frimpong | 25 | 60 | 85 | A1 | 4.0 | Excellent | Yes |
| Yaw Darko | 10 | 30 | 40 | E8 | 0.8 | Fail | No |

### Step 4.3 — Test Mark Absent
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Toggle Yaw's absent switch ON | Row grays out, scores hidden, "Absent" shown in total |
| 2 | Verify absent toggle styling | Red toggle, disabled inputs |
| 3 | Toggle absent switch OFF | Scores reappear (if previously entered) |

### Step 4.4 — Test Bulk Save
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Modify 2 students' scores | "Save All Changes" button appears |
| 2 | Click "Save All Changes" | All modified rows saved, button disappears |

### Step 4.5 — Test Excel Import (if available)
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Bulk Upload | Upload page loads |
| 2 | Download score template | **GET** `/api/tutor/scores/template` → Excel file |
| 3 | Verify template has 5 students pre-filled | StudentIndex, StudentName columns populated |
| 4 | Fill scores in Excel, save | |
| 5 | Upload via Bulk Upload | **POST** `/api/tutor/scores/import` → scores imported |
| 6 | Verify scores updated in score sheet | Previous scores overwritten with new values |

### Step 4.6 — Login as Mathematics Tutor
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Logout, login as Kofi Asante | Tutor dashboard loads |
| 2 | Verify 2 assignments visible | Mathematics in SHS 2 Science A + SHS 2 Arts B |
| 3 | Enter Mathematics scores for SHS 2 Science A | All 5 students scored |
| 4 | Verify 100% completion for Math | Complete badge shown |

---

## FLOW 5: Report Generation (Class Teacher)

### Step 5.1 — Login as Class Teacher
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as John Mensah (class teacher) | Class teacher dashboard loads |
| 2 | Verify dashboard shows "SHS 2 Science A" | Class name and term visible |
| 3 | Navigate to Score Overview | Score matrix with all subjects visible |
| 4 | Verify partial completion | Only Chemistry + Mathematics entered; other subjects missing |

### Step 5.2 — Check Report Readiness
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Generate Reports | Report generation page loads |
| 2 | Check readiness | **GET** `/api/v1/teachers/reports/readiness` |
| 3 | Verify checklist shows missing subjects | ❌ for subjects without scores entered |
| 4 | Note: Admin must enter remaining scores | Or create tutors for remaining subjects |

### Step 5.3 — Complete Score Entry (Admin Override)
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | As Admin: enter/assign remaining subject scores | All subjects have scores for all 5 students |
| 2 | Return to class teacher → Generate Reports | Readiness checklist shows all ✅ |

### Step 5.4 — Generate Reports
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click "Generate All Reports" | Confirmation modal appears |
| 2 | Confirm generation | **POST** `/api/v1/teachers/reports/generate` |
| 3 | Verify progress modal | "Processing student 1 of 5..." counter |
| 4 | Wait for completion | "Reports generated for 5 students" |
| 5 | Verify reports list | All 5 students with GPAs and positions |

### Step 5.5 — Review Generated Reports
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Preview Kwame's report | A4 preview with all scores |
| 2 | Verify all subjects listed | Chemistry, Mathematics, + all others |
| 3 | Verify GPA calculated correctly | Sum of grade points / number of subjects |
| 4 | Verify position shown | Rank among 5 students |
| 5 | Verify AI-generated remarks present | Personalized remarks text visible |
| 6 | Edit Ama's remarks manually → Save | **PUT** `/api/v1/teachers/term-results/{id}/remarks` |
| 7 | Verify updated remarks in preview | New remarks shown |

### Step 5.6 — Download Reports
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Download Kwame's PDF | **GET** `/api/v1/teachers/students/{id}/reports/{termId}` → PDF file |
| 2 | Open downloaded PDF | Correct data, formatted correctly |
| 3 | Download All Reports (ZIP) | **GET** `/api/v1/teachers/reports/{termId}/download` → ZIP |
| 4 | Extract ZIP | Contains 5 PDFs + summary |

### Step 5.7 — View Transcript
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | View Kwame's transcript | Transcript page loads |
| 2 | Verify Term 1 section | All scores visible for Term 1 2024/2025 |
| 3 | Verify CGPA | Same as Term GPA (only 1 term so far) |
| 4 | Download transcript PDF | PDF downloads with all data |

---

## FLOW 6: Student Portal Verification

### Step 6.1 — Login as Kwame Boateng
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as Kwame (student) | Student dashboard loads |
| 2 | Verify greeting | "Good [morning/afternoon/evening], Kwame!" |
| 3 | Verify hero GPA card | Term GPA shown (calculated from scores) |
| 4 | Verify GPA classification badge | e.g., "VERY GOOD" or "DISTINCTION" |
| 5 | Verify class position | Rank shown with trophy if top 3 |
| 6 | Verify CGPA stat card | Same as term GPA (1 term) |
| 7 | Verify subjects stat | Passed/total count correct |
| 8 | Verify attendance card | Percentage shown (if attendance marked) |

### Step 6.2 — View Results
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Results → Term 1 | **GET** `/api/v1/students/results` |
| 2 | Verify all subjects listed | Chemistry, Mathematics, etc. |
| 3 | Verify each subject shows: score, grade, remarks | Correct values |
| 4 | Verify position | Rank among classmates |
| 5 | Download term report PDF | PDF downloads correctly |

### Step 6.3 — View Transcript
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Transcript | **GET** `/api/v1/students/transcript` |
| 2 | Verify Term 1 section visible | One term shown (SHS2 Term 1) |
| 3 | Verify CGPA = Term GPA | Only one term, so they're equal |
| 4 | Download transcript PDF | **GET** `/api/v1/students/transcript/download` → PDF |

### Step 6.4 — AI Study Assistant
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to AI Study Tips | AI insights page loads |
| 2 | Verify personalized insights | Study tips based on weakest subjects |
| 3 | If chat available: send a message | **POST** `/api/v1/students/ai/chat` → response |

### Step 6.5 — Student Profile
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to My Profile | Profile page loads |
| 2 | Verify personal info | Name, index, class, program all correct |
| 3 | Update phone number | **PUT** `/api/v1/students/profile` → saved |

---

## FLOW 7: Attendance Management (Class Teacher)

### Step 7.1 — Mark Attendance
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as class teacher John Mensah | Dashboard loads |
| 2 | Navigate to Attendance | Attendance page with 3 tabs |
| 3 | Open "Mark Attendance" | Modal or tab with student list |
| 4 | Verify all 5 students listed | Names and index numbers visible |
| 5 | Mark Kwame: Present | Green highlight |
| 6 | Mark Ama: Present | |
| 7 | Mark Kojo: Absent → reason: "Illness" | Reason input appears, quick reason buttons shown |
| 8 | Mark Akosua: Late | Amber highlight |
| 9 | Mark Yaw: Present | |
| 10 | Verify progress counter: "5 of 5 marked" | Progress bar at 100% |
| 11 | Verify summary: 3 present, 1 absent, 1 late | Summary chips visible |
| 12 | Click "Submit Attendance" | **POST** `/api/v1/teachers/attendance` → success |

### Step 7.2 — Quick Actions
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open new attendance (next day or reset) | Clean state |
| 2 | Click "Mark All Present" | All students marked present |
| 3 | Verify: 5 present, 0 absent | Summary updates |
| 4 | Click "Reset" | All cleared back to unmarked |

### Step 7.3 — Search & Filter
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Type "Kwame" in search | Only Kwame Boateng visible |
| 2 | Clear search | All 5 students visible again |
| 3 | Click "Not yet marked" filter | Only unmarked students shown |

### Step 7.4 — Attendance Summary
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Switch to Summary tab | Per-student attendance percentages |
| 2 | Verify Kojo shows lower attendance | (1 absent day recorded) |
| 3 | Check color coding | Green ≥90%, Blue ≥75%, Amber ≥60%, Red <60% |

### Step 7.5 — Attendance Sheet
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Switch to Attendance Sheet tab | Weekly grid view |
| 2 | Verify today's column | Green check for present, red X for absent |
| 3 | Navigate to previous/next week | Grid updates |

---

## FLOW 8: Early Warning System (Admin)

### Step 8.1 — Trigger Warning Analysis
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as admin | |
| 2 | Navigate to Early Warnings | Warning management page loads |
| 3 | Click "Run Analysis" | **POST** `/api/v1/admin/warnings/analyze` |
| 4 | Verify Yaw Darko flagged | E8 in Chemistry → academic warning generated |
| 5 | Verify warning level | Level matches severity of performance issues |
| 6 | Verify warning type | ACADEMIC for low grades |
| 7 | Check dashboard warning count | Active Warnings stat card updates |

### Step 8.2 — Warning Detail
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click Yaw's warning | Warning detail view |
| 2 | Verify student info | Name, class, program shown |
| 3 | Verify warning description | Describes academic performance concern |

### Step 8.3 — Resolve Warning
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click "Resolve" on Yaw's warning | Resolution modal appears |
| 2 | Enter resolution note: "Counseling session scheduled" | |
| 3 | Submit resolution | **PATCH** `/api/v1/admin/warnings/{id}/resolve` |
| 4 | Verify RESOLVED badge | Warning shows resolved status |
| 5 | Verify dashboard count decreases | Active warnings count −1 |

### Step 8.4 — Student Warning Visibility
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as Yaw (student) | Student dashboard |
| 2 | Check for "Academic Alert" section | Warning visible in student dashboard |
| 3 | Verify warning description is student-friendly | Not raw admin text |

---

## FLOW 9: Power Rankings (Admin)

### Step 9.1 — View Rankings
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login as admin | |
| 2 | Navigate to Power Rankings | **GET** `/api/v1/admin/rankings` |
| 3 | Verify #1 student | Kwame or Akosua (both A1 in Chemistry) |
| 4 | Verify #5 (last) student | Yaw Darko (lowest GPA) |
| 5 | Verify all 5 students ranked | Complete leaderboard |
| 6 | Verify GPA badges | Color-coded by GPA range |
| 7 | Verify rank medals | Gold (1st), Silver (2nd), Bronze (3rd) |

### Step 9.2 — Special Rankings
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Check "Most Improved" | N/A — only 1 term (need ≥2 for comparison) |
| 2 | Check "Most Declined" | N/A — only 1 term |
| 3 | Check "Scholarship Candidates" | CGPA ≥ 3.5 threshold |
|   | | Kwame (4.0) and Akosua (4.0) may qualify if multi-subject GPA is ≥3.5 |

---

## FLOW 10: Term Locking & Multi-Term (Admin)

### Step 10.1 — Lock Term
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Academic Structure → Terms | Term list visible |
| 2 | Click "Lock" on Term 1 | **PATCH** `/api/v1/admin/terms/{id}/lock` |
| 3 | Verify "Locked" badge | Term shows LOCKED status |
| 4 | Login as tutor | |
| 5 | Try to edit scores | Inputs disabled, "This term is locked" banner shown |
| 6 | Verify 423 response on API call | Score edit returns 423 Locked |

### Step 10.2 — Admin Score Override
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | As admin: edit a score for locked term | **PUT** `/api/admin/scores/{id}` → 200 (admin can override) |
| 2 | Verify score updated | New value visible |

### Step 10.3 — Set Up Term 2
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Set Term 2 as current | **PATCH** `/api/v1/admin/terms/{id}/set-current` |
| 2 | Verify Term 2 is CURRENT | Badge updates |
| 3 | Login as tutor → verify new empty score sheet | Score sheet shows 0% completion for Term 2 |
| 4 | Enter Term 2 scores | |
| 5 | Generate Term 2 reports | |
| 6 | Login as student → verify GPA progression chart | 2 data points now visible (Term 1 + Term 2) |
| 7 | Verify CGPA ≠ Term GPA | CGPA is average across both terms |

---

## FLOW 11: Admin Dashboard Analytics

### Step 11.1 — Stat Cards
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Navigate to Admin Dashboard | |
| 2 | Verify Total Students card | Count matches enrolled students |
| 3 | Verify School Average GPA | Correct average of all student GPAs |
| 4 | Verify Pass Rate | Percentage of students with GPA ≥ C6 threshold |
| 5 | Verify Active Warnings | Count matches unresolved warnings |

### Step 11.2 — Charts
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Verify Term Performance Comparison bar chart | Bars for SHS1, SHS2, SHS3 per term |
| 2 | Verify Grade Distribution pie chart | A1-F9 segments with counts |
| 3 | Verify Class Performance ranking table | Classes ranked by average GPA |
| 4 | Verify grade legend | Color-coded dots match grade colors |

### Step 11.3 — Refresh
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Click "Refresh Data" | All queries re-fetched |
| 2 | Verify data updates | No stale data |

---

## FLOW 12: Edge Cases & Error Handling

### Step 12.1 — Score Validation
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Enter class score > 30 | Input rejected or clamped (HTML max=30) |
| 2 | Enter exam score > 70 | Input rejected or clamped (HTML max=70) |
| 3 | Enter negative score | Input rejected (HTML min=0) |
| 4 | Enter non-numeric value | Input doesn't accept text |

### Step 12.2 — Authentication Edge Cases
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Access `/admin` without login | Redirected to `/login` |
| 2 | Access `/student/dashboard` as admin | Redirected to admin dashboard (role guard) |
| 3 | Access `/admin` as student | Forbidden / redirected |
| 4 | Use expired JWT token | 401 → token refresh or redirect to login |

### Step 12.3 — Concurrent Score Entry
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open score sheet in 2 browser tabs | Both show same data |
| 2 | Edit same student in both tabs | Last save wins, no data corruption |
| 3 | Refresh after conflict | Latest data shown |

### Step 12.4 — Empty States
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Student with no results | "Your term results will appear here" |
| 2 | Admin with no school context set | Empty state with "Set Up Academic Year" button |
| 3 | Class with no students | "No students enrolled in this class" |
| 4 | Rankings with only 1 term | "Most Improved" shows N/A |

---

## FLOW 13: Cross-Browser & Responsive

### Step 13.1 — Browser Compatibility
| Browser | Minimum Version | Test |
|---------|-----------------|------|
| Chrome | 90+ | Full test pass |
| Firefox | 88+ | Full test pass |
| Safari | 14+ | Full test pass |
| Edge | 90+ | Full test pass |

### Step 13.2 — Responsive Breakpoints
| Breakpoint | Width | Test Focus |
|------------|-------|------------|
| Mobile | 375px | Login page, student dashboard, navigation |
| Tablet | 768px | Score entry layout, sidebar collapse |
| Desktop | 1280px | Full layout with sidebar |

---

## Known Issues / Notes

### Grade Calculation Mismatch
> **IMPORTANT**: The frontend `ScoreEntry.tsx` uses a simplified grade scale (skips A2: ≥70 → B2),
> while the backend `GradeCalculator.java` uses the full Ghana GES scale (A2: ≥75, B2: ≥70).
> The backend is authoritative — grades shown during score entry are **preview only**.
> Final grades are calculated by the backend when scores are saved.

### Test Data Cleanup
After running the full QA suite, you may want to reset the database:
```bash
docker compose down -v && docker compose up -d
```
This drops all data and re-seeds the default admin + school.
