package com.shs.academic.config;

import com.shs.academic.security.FirstLoginInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final FirstLoginInterceptor firstLoginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(firstLoginInterceptor)
                .addPathPatterns(
                        "/api/v1/admin/**",
                        "/api/v1/teachers/**",
                        "/api/v1/tutors/**",
                        "/api/v1/students/**",
                        "/api/v1/parents/**"
                );
    }
}
