package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyTipDto {

    private String subject;
    private String tip;
    private Integer weeklyHours;
}
