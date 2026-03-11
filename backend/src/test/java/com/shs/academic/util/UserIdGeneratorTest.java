package com.shs.academic.util;

import com.shs.academic.model.enums.UserRole;
import com.shs.academic.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserIdGeneratorTest {

    @Mock
    private UserRepository userRepository;

    private UserIdGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new UserIdGenerator(userRepository);
    }

    @Nested
    @DisplayName("generate()")
    class GenerateTests {

        @Test
        void testFormat_student() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.STUDENT);
            assertTrue(id.matches("GES-STD-\\d{4}"), "Expected GES-STD-XXXX, got: " + id);
        }

        @Test
        void testFormat_classTeacher() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.CLASS_TEACHER);
            assertTrue(id.matches("GES-TCH-\\d{4}"), "Expected GES-TCH-XXXX, got: " + id);
        }

        @Test
        void testFormat_tutor() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.TUTOR);
            assertTrue(id.matches("GES-TUT-\\d{4}"), "Expected GES-TUT-XXXX, got: " + id);
        }

        @Test
        void testFormat_admin() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.SUPER_ADMIN);
            assertTrue(id.matches("GES-ADM-\\d{4}"), "Expected GES-ADM-XXXX, got: " + id);
        }

        @Test
        void testFormat_parent() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.PARENT);
            assertTrue(id.matches("GES-PAR-\\d{4}"), "Expected GES-PAR-XXXX, got: " + id);
        }

        @Test
        void testLength() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            String id = generator.generate(UserRole.STUDENT);
            assertEquals(12, id.length(), "Expected length 12, got: " + id.length() + " for: " + id);
        }

        @Test
        void testUniqueness_50Ids_highProbability() {
            // With 9000 possible values, 50 draws have ~87% chance of all unique
            // (birthday problem). We verify the generator produces valid IDs and
            // that the vast majority are unique (allow up to 2 collisions).
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            Set<String> ids = new HashSet<>();
            int total = 50;
            for (int i = 0; i < total; i++) {
                ids.add(generator.generate(UserRole.STUDENT));
            }
            assertTrue(ids.size() >= total - 2,
                    "Expected at least " + (total - 2) + " unique IDs out of " + total + ", got: " + ids.size());
        }

        @Test
        void testRetries_whenDuplicateExists() {
            // First call returns true (duplicate), second returns false
            when(userRepository.existsByUserId(anyString()))
                    .thenReturn(true)
                    .thenReturn(false);
            String id = generator.generate(UserRole.STUDENT);
            assertNotNull(id);
            assertTrue(id.matches("GES-STD-\\d{4}"));
        }

        @Test
        void testDigits_inRange_1000_to_9999() {
            when(userRepository.existsByUserId(anyString())).thenReturn(false);
            for (int i = 0; i < 50; i++) {
                String id = generator.generate(UserRole.STUDENT);
                String digits = id.substring(8); // "GES-STD-" = 8 chars
                int num = Integer.parseInt(digits);
                assertTrue(num >= 1000 && num <= 9999,
                        "Digit portion should be 1000-9999, got: " + num);
            }
        }
    }
}
