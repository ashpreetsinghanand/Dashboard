package com.krsi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default OTP sender: logs a masked line only (the code itself is never logged). To send real SMS, add a
 * bean implementing {@link OtpSender} and annotate it {@code @Primary}.
 */
@Component
public class LoggingOtpSender implements OtpSender {
    private static final Logger log = LoggerFactory.getLogger(LoggingOtpSender.class);

    @Override
    public void sendOtp(String phone, String code) {
        log.info("OTP for ******{} generated. No SMS gateway configured; use devOtp in local development.",
                phone.substring(phone.length() - 4));
    }
}
