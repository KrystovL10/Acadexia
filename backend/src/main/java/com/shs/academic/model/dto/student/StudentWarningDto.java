package com.shs.academic.model.dto.student;

import com.shs.academic.model.enums.WarningLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentWarningDto {

    private Long id;
    private WarningLevel warningLevel;
    private String warningType;
    private String friendlyMessage;
    private String suggestedAction;
    private LocalDateTime generatedAt;
}
