package com.krsi.service;

/** Delivers OTP codes. Provide your own bean (MSG91, Twilio, AWS SNS ...) to replace {@link LoggingOtpSender}. */
public interface OtpSender {
    void sendOtp(String phone, String code);
}
