package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsightDto {

    private String category;
    private String title;
    private String body;
    private String affectedScope;
    private String suggestedAction;
    private String priority;
}
