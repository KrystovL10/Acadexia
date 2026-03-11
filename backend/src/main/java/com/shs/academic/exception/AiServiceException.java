package com.shs.academic.exception;

import lombok.Getter;

@Getter
public class AiServiceException extends RuntimeException {

    private final Integer statusCode;

    public AiServiceException(String message) {
        super(message);
        this.statusCode = null;
    }

    public AiServiceException(String message, Integer statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = null;
    }
}
