package com.shs.academic.util;

import com.shs.academic.exception.RateLimitException;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class RateLimiter {

    private static final int MAX_REQUESTS_PER_HOUR = 10;

    private final ConcurrentHashMap<Long, List<LocalDateTime>> callMap = new ConcurrentHashMap<>();

    /**
     * Check and record a call for the given student.
     * Throws RateLimitException if the student has exceeded the hourly limit.
     */
    public void checkRateLimit(Long studentId) {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);

        List<LocalDateTime> calls = callMap.computeIfAbsent(studentId, k -> new CopyOnWriteArrayList<>());

        // Prune old entries
        calls.removeIf(ts -> ts.isBefore(oneHourAgo));

        if (calls.size() >= MAX_REQUESTS_PER_HOUR) {
            throw new RateLimitException(
                    "You have reached the maximum of " + MAX_REQUESTS_PER_HOUR +
                    " AI chat messages per hour. Please try again later.");
        }

        calls.add(LocalDateTime.now());
    }
}
