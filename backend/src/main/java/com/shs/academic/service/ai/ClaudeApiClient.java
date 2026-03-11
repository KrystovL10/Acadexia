package com.shs.academic.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.shs.academic.config.AnthropicConfig;
import com.shs.academic.exception.AiServiceException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClaudeApiClient {

    private final AnthropicConfig config;
    private final ObjectMapper objectMapper;

    private OkHttpClient httpClient;

    private static final MediaType JSON = MediaType.get("application/json");

    @PostConstruct
    void init() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Send a single-turn message to Claude.
     */
    public String sendMessage(String systemPrompt, String userMessage) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getModel());
        body.put("max_tokens", config.getMaxTokens());
        body.put("system", systemPrompt);

        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", userMessage);

        return executeRequest(body);
    }

    /**
     * Send a multi-turn conversation to Claude (for AI study assistant, etc.).
     */
    public String sendMessageWithHistory(String systemPrompt, List<Map<String, String>> messages) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getModel());
        body.put("max_tokens", config.getMaxTokens());
        body.put("system", systemPrompt);

        ArrayNode messagesArray = body.putArray("messages");
        for (Map<String, String> m : messages) {
            ObjectNode msg = messagesArray.addObject();
            msg.put("role", m.get("role"));
            msg.put("content", m.get("content"));
        }

        return executeRequest(body);
    }

    private String executeRequest(ObjectNode requestBody) {
        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(requestBody);
        } catch (IOException e) {
            throw new AiServiceException("Failed to serialize AI request", e);
        }

        Request request = new Request.Builder()
                .url(config.getUrl())
                .post(RequestBody.create(bodyJson, JSON))
                .addHeader("x-api-key", config.getKey())
                .addHeader("anthropic-version", config.getVersion())
                .addHeader("content-type", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";

            if (!response.isSuccessful()) {
                log.error("Claude API error [{}]: {}", response.code(), responseBody);
                throw new AiServiceException(
                        "Claude API returned status " + response.code(),
                        response.code()
                );
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode content = root.path("content");

            if (content.isArray() && !content.isEmpty()) {
                return content.get(0).path("text").asText();
            }

            log.error("Unexpected Claude API response structure: {}", responseBody);
            throw new AiServiceException("Unexpected response structure from Claude API");

        } catch (IOException e) {
            log.error("Network error calling Claude API: {}", e.getMessage());
            throw new AiServiceException("Failed to connect to AI service", e);
        }
    }
}
