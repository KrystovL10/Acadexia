package com.shs.academic.model.dto;

import com.shs.academic.model.entity.ClassRoom;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRoomDto {

    private Long id;
    private String classCode;
    private String displayName;
    private YearGroup yearGroup;
    private Long programId;
    private String programName;
    private Long schoolId;
    private Long academicYearId;
    private String academicYearLabel;
    private Long classTeacherId;
    private String teacherName;
    private Integer capacity;
    private boolean isActive;
    private int studentCount;
    private LocalDateTime createdAt;

    public static ClassRoomDto fromEntity(ClassRoom classRoom) {
        String teacherName = null;
        Long teacherId = null;
        if (classRoom.getClassTeacher() != null) {
            teacherId = classRoom.getClassTeacher().getId();
            teacherName = classRoom.getClassTeacher().getFirstName()
                    + " " + classRoom.getClassTeacher().getLastName();
        }

        return ClassRoomDto.builder()
                .id(classRoom.getId())
                .classCode(classRoom.getClassCode())
                .displayName(classRoom.getDisplayName())
                .yearGroup(classRoom.getYearGroup())
                .programId(classRoom.getProgram().getId())
                .programName(classRoom.getProgram().getDisplayName())
                .schoolId(classRoom.getSchool().getId())
                .academicYearId(classRoom.getAcademicYear().getId())
                .academicYearLabel(classRoom.getAcademicYear().getYearLabel())
                .classTeacherId(teacherId)
                .teacherName(teacherName)
                .capacity(classRoom.getCapacity())
                .isActive(classRoom.isActive())
                .createdAt(classRoom.getCreatedAt())
                .build();
    }
}
