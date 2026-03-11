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
     * Send a single-turn message to Gemini.
     */
    public String sendMessage(String systemPrompt, String userMessage) {
        ObjectNode body = buildBaseBody(systemPrompt);

        ArrayNode contents = body.putArray("contents");
        ObjectNode userContent = contents.addObject();
        userContent.put("role", "user");
        userContent.putArray("parts").addObject().put("text", userMessage);

        return executeRequest(body);
    }

    /**
     * Send a multi-turn conversation to Gemini.
     * History messages use role "user" or "assistant" — Gemini expects "user" or "model".
     */
    public String sendMessageWithHistory(String systemPrompt, List<Map<String, String>> messages) {
        ObjectNode body = buildBaseBody(systemPrompt);

        ArrayNode contents = body.putArray("contents");
        for (Map<String, String> m : messages) {
            ObjectNode content = contents.addObject();
            String role = "assistant".equals(m.get("role")) ? "model" : "user";
            content.put("role", role);
            content.putArray("parts").addObject().put("text", m.get("content"));
        }

        return executeRequest(body);
    }

    private ObjectNode buildBaseBody(String systemPrompt) {
        ObjectNode body = objectMapper.createObjectNode();

        // System instruction
        ObjectNode sysInstruction = body.putObject("system_instruction");
        sysInstruction.putArray("parts").addObject().put("text", systemPrompt);

        // Generation config
        ObjectNode genConfig = body.putObject("generationConfig");
        genConfig.put("maxOutputTokens", config.getMaxTokens());

        return body;
    }

    private String executeRequest(ObjectNode requestBody) {
        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(requestBody);
        } catch (IOException e) {
            throw new AiServiceException("Failed to serialize AI request", e);
        }

        // Gemini URL: {base}/{model}:generateContent?key={apiKey}
        String url = config.getUrl() + "/" + config.getModel() + ":generateContent?key=" + config.getKey();

        Request request = new Request.Builder()
                .url(url)
                .post(RequestBody.create(bodyJson, JSON))
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";

            if (!response.isSuccessful()) {
                log.error("Gemini API error [{}]: {}", response.code(), responseBody);
                throw new AiServiceException("Gemini API returned status " + response.code(), response.code());
            }

            // Gemini response: candidates[0].content.parts[0].text
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");

            if (!text.isMissingNode()) {
                return text.asText();
            }

            log.error("Unexpected Gemini API response structure: {}", responseBody);
            throw new AiServiceException("Unexpected response structure from Gemini API");

        } catch (IOException e) {
            log.error("Network error calling Gemini API: {}", e.getMessage());
            throw new AiServiceException("Failed to connect to AI service", e);
        }
    }
}
