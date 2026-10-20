package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.config.AppProperties;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.response.CommodityResponse;
import com.krsi.ledger.LedgerRepository;
import com.krsi.model.UserCategory;
import com.krsi.service.MarketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Health check and the reference lists behind the sign-up screens and filters. */
@RestController
@RequestMapping("/api")
@Tag(name = OpenApiConfig.TAG_SYSTEM)
public class SystemController {
    @Schema(description = "UP when the database answers; DOWN otherwise")
    public record Health(String status, String database, long ledgerBlocks) {}

    @Schema(description = "A card on the Select Your Category screen")
    public record CategoryOption(String id, String label, String role, boolean selfSignup) {}

    @Schema(description = "A card on the Choose Your Language screen")
    public record LanguageOption(String code, String label) {}

    private static final List<LanguageOption> LANGUAGES = List.of(
            new LanguageOption("hi", "हिन्दी"), new LanguageOption("en", "English"), new LanguageOption("bn", "Bengali-বাংলা"),
            new LanguageOption("te", "Telugu-తెలుగు"), new LanguageOption("ta", "Tamil-தமிழ்"), new LanguageOption("mr", "Marathi-मराठी"),
            new LanguageOption("gu", "Gujarati-ગુજરાતી"), new LanguageOption("kn", "Kannada-ಕನ್ನಡ"),
            new LanguageOption("ml", "Malayalam-മലയാളം"), new LanguageOption("pa", "Punjabi-ਪੰਜਾਬੀ"));

    private final JdbcTemplate jdbc;
    private final LedgerRepository ledger;
    private final MarketService market;
    private final AppProperties properties;

    public SystemController(JdbcTemplate jdbc, LedgerRepository ledger, MarketService market, AppProperties properties) {
        this.jdbc = jdbc;
        this.ledger = ledger;
        this.market = market;
        this.properties = properties;
    }

    @Operation(summary = "Service health", description = "200 when the database is reachable, 503 otherwise.")
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Health>> health() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(ApiResponse.ok(new Health("UP", "UP", ledger.count())));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.ok(new Health("DOWN", "DOWN", -1)));
        }
    }

    @Operation(summary = "Sign-up categories and the role each one maps to")
    @GetMapping("/reference/categories")
    public ApiResponse<List<CategoryOption>> categories() {
        return ApiResponse.ok(Arrays.stream(UserCategory.values())
                .map(c -> new CategoryOption(c.id(), c.label(), c.role().name(),
                        c != UserCategory.AUDITOR || properties.auth().allowAuditorSignup()))
                .toList());
    }

    @Operation(summary = "Supported languages")
    @GetMapping("/reference/languages")
    public ApiResponse<List<LanguageOption>> languages() { return ApiResponse.ok(LANGUAGES); }

    @Operation(summary = "Commodities with their category and image", description = "Use these names in every request that takes a commodity.")
    @GetMapping("/reference/commodities")
    public ApiResponse<List<CommodityResponse>> commodities() { return ApiResponse.ok(market.commodities()); }
}
