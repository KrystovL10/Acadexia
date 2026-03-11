package com.shs.academic.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "anthropic.api")
public class AnthropicConfig {

    private String key;
    private String url;
    private String model;
    private Integer maxTokens;
    private String version;
}
