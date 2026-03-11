package com.shs.academic.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class TokenBlacklistService {

    // Maps token -> expiry timestamp (millis)
    private final Map<String, Long> blacklistedTokens = new ConcurrentHashMap<>();

    public void blacklistToken(String token, long expiryTimeMillis) {
        blacklistedTokens.put(token, expiryTimeMillis);
        log.debug("Token blacklisted, total blacklisted: {}", blacklistedTokens.size());
    }

    public boolean isBlacklisted(String token) {
        return blacklistedTokens.containsKey(token);
    }

    @Scheduled(fixedRate = 3600000) // Every hour
    public void cleanupExpiredTokens() {
        long now = System.currentTimeMillis();
        int before = blacklistedTokens.size();
        blacklistedTokens.entrySet().removeIf(entry -> entry.getValue() < now);
        int removed = before - blacklistedTokens.size();
        if (removed > 0) {
            log.info("Cleaned up {} expired blacklisted tokens, remaining: {}", removed, blacklistedTokens.size());
        }
    }
}
