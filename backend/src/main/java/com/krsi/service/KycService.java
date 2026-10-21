package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.response.KycResponses;
import com.krsi.exception.ApiException;
import com.krsi.exception.ErrorCode;
import com.krsi.repository.KycRepository;
import com.krsi.repository.UserRepository;
import com.krsi.security.AuthUser;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Aadhaar KYC through Setu's DigiLocker API (https://docs.setu.co/data/digilocker):
 * start -> user consents on DigiLocker -> DigiLocker redirects back with ?id= -> complete reads the Aadhaar summary.
 * Provider "mock" keeps the same flow with dummy request ids and always verifies, so demos never block.
 */
@Service
public class KycService {
    private static final Logger log = LoggerFactory.getLogger(KycService.class);
    private static final String MOCK = "mock";

    private final KycRepository kyc;
    private final UserRepository users;
    private final AppProperties.Kyc settings;
    private final AppProperties.Cors cors;

    public KycService(KycRepository kyc, UserRepository users, AppProperties properties) {
        this.kyc = kyc;
        this.users = users;
        this.settings = properties.kyc();
        this.cors = properties.cors();
    }

    public KycResponses.Status status(AuthUser me) { return kyc.status(me.id()); }

    @Transactional
    public KycResponses.Start start(AuthUser me, String redirectUrl) {
        // DigiLocker sends the user to this URL afterwards; only our own app pages may be the target (no open redirect)
        if (cors.allowedOrigins().stream().noneMatch(origin -> redirectUrl.startsWith(origin + "/")))
            throw ApiException.invalid("redirectUrl must be a page of this app");
        String provider = settings.provider();
        String requestId;
        String url;
        if (MOCK.equals(provider)) {
            requestId = "mock-" + UUID.randomUUID();
            url = redirectUrl + (redirectUrl.contains("?") ? "&" : "?") + "id=" + requestId;
        } else {
            Map<String, Object> created = setu(client -> client.post().uri("/api/digilocker/").body(Map.of("redirectUrl", redirectUrl)));
            requestId = String.valueOf(created.get("id"));
            url = String.valueOf(created.get("url"));
        }
        kyc.insertRequest(me.id(), provider, requestId);
        log.info("KYC request {} started for user {} via {}", requestId, me.id(), provider);
        return new KycResponses.Start(requestId, url, provider);
    }

    @Transactional
    public KycResponses.Status complete(AuthUser me, String requestId) {
        String provider = kyc.providerOf(me.id(), requestId).orElseThrow(() -> ApiException.notFound("KYC request", requestId));
        if (MOCK.equals(provider)) {
            kyc.verify(me.id(), requestId, users.findById(me.id()).map(u -> u.displayName()).orElse(null), null, null, null);
        } else {
            Map<String, Object> state = setu(client -> client.get().uri("/api/digilocker/{id}/status", requestId));
            String status = String.valueOf(state.get("status"));
            if ("revoked".equals(status)) kyc.fail(me.id(), requestId);
            else if ("authenticated".equals(status)) {
                Object aadhaar = setu(client -> client.get().uri("/api/digilocker/{id}/aadhaar", requestId)).get("aadhaar");
                Map<?, ?> a = aadhaar instanceof Map<?, ?> m ? m : Map.of();
                String masked = String.valueOf(a.get("maskedNumber")).replaceAll("\\D", "");
                kyc.verify(me.id(), requestId, (String) a.get("name"), (String) a.get("dateOfBirth"), (String) a.get("gender"),
                        masked.length() >= 4 ? masked.substring(masked.length() - 4) : null);
            }
            // "unauthenticated": the user has not finished on DigiLocker yet; the status stays NONE and they can retry
        }
        return kyc.status(me.id());
    }

    /** Booking gate; only enforced when app.kyc.required-for-booking is on. */
    public void requireVerifiedForBooking(AuthUser me) {
        if (settings.requiredForBooking() && !kyc.isVerified(me.id()))
            throw new ApiException(ErrorCode.KYC_REQUIRED, "Verify your identity with DigiLocker before booking storage");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> setu(Function<RestClient, RestClient.RequestHeadersSpec<?>> request) {
        if (blank(settings.setuClientId()) || blank(settings.setuClientSecret()) || blank(settings.setuProductInstanceId()))
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, "Setu KYC is not configured on this server");
        RestClient client = RestClient.builder()
                .baseUrl(settings.setuBaseUrl())
                .defaultHeader("x-client-id", settings.setuClientId())
                .defaultHeader("x-client-secret", settings.setuClientSecret())
                .defaultHeader("x-product-instance-id", settings.setuProductInstanceId())
                .build();
        try {
            Map<String, Object> body = request.apply(client).retrieve().body(Map.class);
            return body == null ? Map.of() : body;
        } catch (RestClientResponseException e) {
            String text = e.getResponseBodyAsString();
            log.warn("Setu call failed: HTTP {} {}", e.getStatusCode().value(), text.length() > 300 ? text.substring(0, 300) : text);
            // Setu's edge answers non-allowlisted IPs with an HTML 403
            String why = e.getStatusCode().value() == 403 && text.contains("<") ? "Setu refused this server (its IP must be allowlisted in the Setu dashboard)"
                    : "DigiLocker verification failed (Setu HTTP " + e.getStatusCode().value() + ")";
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, why);
        } catch (ResourceAccessException e) {
            throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE, "Could not reach Setu");
        }
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
}
