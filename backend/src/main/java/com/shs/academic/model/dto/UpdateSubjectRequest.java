package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSubjectRequest {

    private String name;

    private String subjectCode;

    private Boolean isCore;

    private Boolean isElective;
}
