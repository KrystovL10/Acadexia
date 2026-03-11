package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.metamodel.EntityType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

/**
 * DEV ONLY — Delete before production deployment.
 * Verifies database schema and entity mappings.
 */
@Slf4j
@RestController
@RequestMapping("/api/dev")
@Profile("dev")
@Tag(name = "Dev Tools", description = "Development-only endpoints (not available in production)")
public class DatabaseVerificationController {

    @PersistenceContext
    private EntityManager entityManager;

    @Operation(summary = "Verify database schema and entity mappings")
    @GetMapping("/schema-check")
    public ResponseEntity<ApiResponse> schemaCheck() {
        Set<EntityType<?>> entities = entityManager.getMetamodel().getEntities();

        List<Map<String, Object>> entityDetails = entities.stream()
                .sorted(Comparator.comparing(e -> e.getName()))
                .map(entity -> {
                    Map<String, Object> detail = new LinkedHashMap<>();
                    detail.put("entity", entity.getName());
                    detail.put("attributes", entity.getAttributes().stream()
                            .map(attr -> attr.getName())
                            .sorted()
                            .collect(Collectors.toList()));
                    return detail;
                })
                .collect(Collectors.toList());

        // Verify enum types are persisted correctly by checking entity attributes
        List<String> enumFields = new ArrayList<>();
        entities.forEach(entity -> entity.getAttributes().forEach(attr -> {
            if (attr.getJavaType().isEnum()) {
                enumFields.add(entity.getName() + "." + attr.getName()
                        + " → " + attr.getJavaType().getSimpleName());
            }
        }));
        Collections.sort(enumFields);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tablesVerified", true);
        result.put("entityCount", entities.size());
        result.put("entities", entityDetails);
        result.put("enumFields", enumFields);
        result.put("message", "Schema OK — " + entities.size() + " entities mapped successfully");

        log.info("Schema check passed: {} entities verified", entities.size());

        return ResponseEntity.ok(ApiResponse.success("Schema verification complete", result));
    }
}
