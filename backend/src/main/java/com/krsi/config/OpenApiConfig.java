package com.krsi.config;

import com.krsi.dto.common.ErrorEnvelope;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** OpenAPI (Swagger) setup. The spec is at {@code /v3/api-docs} and the UI at {@code /swagger-ui.html}. */
@Configuration
public class OpenApiConfig {
    public static final String TAG_AUTH = "1. Auth & Profile";
    public static final String TAG_DASHBOARD = "2. Dashboard";
    public static final String TAG_WAREHOUSES = "3. Warehouses";
    public static final String TAG_BOOKINGS = "4. Bookings";
    public static final String TAG_ENWR = "5. eNWR (warehouse receipts)";
    public static final String TAG_TRADE = "6. Trade (listings, bids, marketplace)";
    public static final String TAG_INVOICES = "7. Storage invoices";
    public static final String TAG_LOANS = "8. Loans";
    public static final String TAG_MARKET = "9. Market prices";
    public static final String TAG_AUDIT = "10. Audit & ledger";
    public static final String TAG_SYSTEM = "11. System & reference";
    public static final String TAG_KYC = "12. KYC (DigiLocker)";
    public static final String BEARER = "bearerAuth";

    private static final String ERROR_SCHEMA = "ErrorEnvelope";
    private static final Map<String, String> STANDARD_ERRORS = Map.of(
            "400", "Invalid request (INVALID_REQUEST); see error.details for field problems",
            "401", "Missing or expired token (UNAUTHORIZED)",
            "403", "Role not allowed or not your resource (FORBIDDEN)",
            "500", "Unexpected server error (INTERNAL_ERROR)");

    @Bean
    public OpenAPI krsiOpenApi(@Value("${spring.application.name}") String appName) {
        return new OpenAPI()
                .info(new Info().title("KRSI API").version("0.1.0").description("""
                        Crop storage, warehouse receipts (eNWR), trading and finance for farmers, merchants, \
                        warehouse owners and auditors (%s). Every state change is written to a tamper-evident \
                        hash-chained ledger that auditors can verify.

                        Every response uses the envelope `{ success, data, error, traceId, timestamp }`. \
                        Sign in with `POST /api/auth/login`, then click **Authorize** and paste the `accessToken`.

                        Demo users (password `Krsi@1234`): farmer 9000000001, merchant 9000000002, \
                        warehouse owner 9000000003, auditor 9000000004.""".formatted(appName)))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .addTagsItem(new Tag().name(TAG_AUTH).description("Phone + OTP sign-up, password sign-in, profile"))
                .addTagsItem(new Tag().name(TAG_DASHBOARD).description("Role-specific home screen data"))
                .addTagsItem(new Tag().name(TAG_WAREHOUSES).description("Find, view and manage warehouses"))
                .addTagsItem(new Tag().name(TAG_BOOKINGS).description("Storage booking requests and deposits"))
                .addTagsItem(new Tag().name(TAG_ENWR).description("Electronic negotiable warehouse receipts"))
                .addTagsItem(new Tag().name(TAG_TRADE).description("Sell receipts, bid on them, settle trades"))
                .addTagsItem(new Tag().name(TAG_INVOICES).description("Storage charges"))
                .addTagsItem(new Tag().name(TAG_LOANS).description("Loans against receipts (demo lender)"))
                .addTagsItem(new Tag().name(TAG_MARKET).description("Commodity prices, gainers/losers, watchlist"))
                .addTagsItem(new Tag().name(TAG_AUDIT).description("Quality inspections, warehouse audits, ledger verification"))
                .addTagsItem(new Tag().name(TAG_SYSTEM).description("Health and reference lists"))
                .addTagsItem(new Tag().name(TAG_KYC).description("Aadhaar KYC via DigiLocker (Setu), required before booking when enabled"));
    }

    /** Documents the error body once and attaches it to every 4xx/5xx response. */
    @Bean
    public OpenApiCustomizer errorEnvelopeCustomizer() {
        return openApi -> {
            ResolvedSchema resolved = ModelConverters.getInstance().resolveAsResolvedSchema(new AnnotatedType(ErrorEnvelope.class));
            if (openApi.getComponents() == null) openApi.setComponents(new Components());
            openApi.getComponents().addSchemas(ERROR_SCHEMA, resolved.schema);
            if (resolved.referencedSchemas != null) resolved.referencedSchemas.forEach(openApi.getComponents()::addSchemas);
            if (openApi.getPaths() == null) return;
            openApi.getPaths().values().forEach(path -> path.readOperations().forEach(operation -> {
                if (operation.getResponses() == null) operation.setResponses(new ApiResponses());
                ApiResponses responses = operation.getResponses();
                STANDARD_ERRORS.forEach((code, description) -> {
                    if (!responses.containsKey(code)) responses.addApiResponse(code, new ApiResponse().description(description));
                });
                responses.forEach((code, response) -> {
                    if (code.startsWith("4") || code.startsWith("5")) response.setContent(new Content().addMediaType("application/json",
                            new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + ERROR_SCHEMA))));
                });
            }));
        };
    }
}
