package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.exception.ApiException;
import com.krsi.exception.ErrorCode;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Sends OTPs by SMS through Fast2SMS "Quick SMS" (route q: free text, no DLT template; ₹7 per SMS on this account).
 * Without FAST2SMS_API_KEY it falls back to {@link LoggingOtpSender}, so local development needs no key.
 * shortcut: Quick SMS is the costly non-DLT route; switch to Fast2SMS Smart OTP (/dev/otp/send) once a DLT template is approved.
 */
@Primary
@Component
public class Fast2SmsOtpSender implements OtpSender {
    private static final Logger log = LoggerFactory.getLogger(Fast2SmsOtpSender.class);
    private static final String UNAVAILABLE = "We couldn't send the SMS right now. Please try again in a minute.";

    private final String apiKey;
    private final long ttlMinutes;
    private final LoggingOtpSender fallback;
    private final RestClient http = RestClient.create("https://www.fast2sms.com");

    public Fast2SmsOtpSender(AppProperties properties, LoggingOtpSender fallback) {
        this.apiKey = properties.otp().fast2smsApiKey();
        this.ttlMinutes = Math.max(1, properties.otp().ttl().toMinutes());
        this.fallback = fallback;
    }

    @Override
    public void sendOtp(String phone, String code) {
        if (apiKey == null || apiKey.isBlank()) {
            fallback.sendOtp(phone, code);
            return;
        }
        String digits = phone.replaceAll("\\D", "");
        String mobile = digits.length() > 10 ? digits.substring(digits.length() - 10) : digits; // Fast2SMS wants the 10-digit number
        String message = "Your Krsi verification code is " + code + ". It expires in " + ttlMinutes + " minutes. Do not share it with anyone.";
        Map<?, ?> body;
        try {
            body = http.post().uri("/dev/bulkV2")
                    .header("Authorization", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("route", "q", "message", message, "numbers", mobile))
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientResponseException e) {
            // the error body never contains the code (we only send it); safe to log for diagnosis
            log.warn("Fast2SMS HTTP {}: {}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, UNAVAILABLE);
        } catch (ResourceAccessException e) {
            log.warn("Fast2SMS unreachable: {}", e.getMessage());
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, UNAVAILABLE);
        }
        if (body == null || !Boolean.TRUE.equals(body.get("return"))) {
            log.warn("Fast2SMS rejected the OTP SMS: {}", body == null ? "empty response" : body.get("message"));
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, UNAVAILABLE);
        }
        log.info("OTP SMS sent to ******{} via Fast2SMS (request {})", mobile.substring(Math.max(0, mobile.length() - 4)), body.get("request_id"));
    }
}
