package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateClassRoomRequest {

    @NotNull(message = "School ID is required")
    private Long schoolId;

    @NotNull(message = "Academic year ID is required")
    private Long academicYearId;

    @NotNull(message = "Program ID is required")
    private Long programId;

    @NotNull(message = "Year group is required")
    private YearGroup yearGroup;

    @NotBlank(message = "Display name is required")
    private String displayName;

    @NotBlank(message = "Class code is required")
    private String classCode;

    @Builder.Default
    private Integer capacity = 45;
}
