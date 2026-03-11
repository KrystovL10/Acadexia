package com.shs.academic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.shs.academic.model.entity.Subject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDto {

    private Long id;
    private String subjectCode;
    private String name;
    @JsonProperty("isCore")
    private boolean isCore;
    @JsonProperty("isElective")
    private boolean isElective;
    private Long schoolId;
    @JsonProperty("isActive")
    private boolean isActive;
    private LocalDateTime createdAt;

    public static SubjectDto fromEntity(Subject subject) {
        return SubjectDto.builder()
                .id(subject.getId())
                .subjectCode(subject.getSubjectCode())
                .name(subject.getName())
                .isCore(subject.isCore())
                .isElective(subject.isElective())
                .schoolId(subject.getSchool().getId())
                .isActive(subject.isActive())
                .createdAt(subject.getCreatedAt())
                .build();
    }
}
