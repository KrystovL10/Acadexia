package com.shs.academic.util;

import com.shs.academic.model.enums.UserRole;
import com.shs.academic.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
@RequiredArgsConstructor
public class UserIdGenerator {

    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    private static String rolePrefix(UserRole role) {
        return switch (role) {
            case SUPER_ADMIN -> "ADM";
            case CLASS_TEACHER -> "TCH";
            case TUTOR -> "TUT";
            case STUDENT -> "STD";
            case PARENT -> "PAR";
        };
    }

    public String generate(UserRole role) {
        String prefix = rolePrefix(role);
        String userId;
        do {
            int digits = 1000 + random.nextInt(9000);
            userId = "GES-" + prefix + "-" + digits;
        } while (userRepository.existsByUserId(userId));
        return userId;
    }
}
