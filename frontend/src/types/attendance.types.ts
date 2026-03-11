// ==================== SCHOOL-WIDE ATTENDANCE STATS ====================

export interface SchoolAttendanceStatsDto {
  schoolId: number;
  termLabel: string;
  overallAvgAttendance: number;
  studentsAbove90: number;
  students75to90: number;
  students65to75: number;
  studentsBelow65: number;
  totalStudents: number;
  classBreakdown: ClassAttendanceDto[];
  yearGroupBreakdown: YearGroupAttendanceDto[];
  dailyTrend: DailyAttendanceTrendDto[];
  mostAbsentStudents: StudentAttendanceRankDto[];
  perfectAttendanceStudents: StudentAttendanceRankDto[];
}

export interface ClassAttendanceDto {
  classId: number;
  className: string;
  yearGroup: string;
  avgAttendance: number;
  studentsAtRisk: number;
  totalStudents: number;
}

export interface YearGroupAttendanceDto {
  yearGroup: string;
  avgAttendance: number;
  totalStudents: number;
  studentsAtRisk: number;
  classes: ClassAttendanceDto[];
}

export interface DailyAttendanceTrendDto {
  date: string;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface StudentAttendanceRankDto {
  studentId: number;
  studentName: string;
  studentIndex: string;
  className: string;
  yearGroup: string;
  attendancePercentage: number;
  daysPresent: number;
  daysAbsent: number;
}

// ==================== ADMIN ATTENDANCE OVERRIDE ====================

export interface AttendanceOverrideRequest {
  studentId: number;
  date: string;
  newStatus: 'PRESENT' | 'ABSENT' | 'LATE';
  reason: string;
  overrideNote: string;
}
