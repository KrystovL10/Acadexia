package com.shs.academic.model.dto;

import com.shs.academic.model.entity.ClassRoom;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRoomSummaryDto {

    private Long id;
    private String classCode;
    private String displayName;
    private YearGroup yearGroup;
    private String programName;
    private String teacherName;
    private int studentCount;

    public static ClassRoomSummaryDto fromEntity(ClassRoom classRoom) {
        String teacherName = null;
        if (classRoom.getClassTeacher() != null) {
            teacherName = classRoom.getClassTeacher().getFirstName()
                    + " " + classRoom.getClassTeacher().getLastName();
        }

        return ClassRoomSummaryDto.builder()
                .id(classRoom.getId())
                .classCode(classRoom.getClassCode())
                .displayName(classRoom.getDisplayName())
                .yearGroup(classRoom.getYearGroup())
                .programName(classRoom.getProgram().getDisplayName())
                .teacherName(teacherName)
                .build();
    }
}
