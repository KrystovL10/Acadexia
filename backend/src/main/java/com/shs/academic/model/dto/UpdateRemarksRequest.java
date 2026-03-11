package com.shs.academic.model.dto;

import lombok.Data;

@Data
public class UpdateRemarksRequest {

    /** Class teacher's remarks — editable by CLASS_TEACHER */
    private String classTeacherRemarks;

    /** Conduct rating (Excellent / Good / Fair / Poor) — editable by CLASS_TEACHER */
    private String conductRating;

    /** Headmaster's remarks — only updatable by SUPER_ADMIN */
    private String headmasterRemarks;
}
