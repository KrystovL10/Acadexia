package com.shs.academic.exception;

public class ScoreLockedException extends RuntimeException {

    public ScoreLockedException(String message) {
        super(message);
    }
}
