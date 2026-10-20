package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.BookingRequests;
import com.krsi.dto.response.BookingResponse;
import com.krsi.dto.response.DepositResult;
import com.krsi.ledger.EntityProof;
import com.krsi.security.CurrentUser;
import com.krsi.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
@Tag(name = OpenApiConfig.TAG_BOOKINGS)
public class BookingController {
    private final BookingService bookings;
    private final CurrentUser currentUser;

    public BookingController(BookingService bookings, CurrentUser currentUser) {
        this.bookings = bookings;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Request storage (Book Now modal)", description = "Farmers and merchants. The commodity must be one the warehouse stores.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping
    public ApiResponse<BookingResponse> create(@Valid @RequestBody BookingRequests.Create request) {
        return ApiResponse.ok(bookings.create(currentUser.require(), request));
    }

    @Operation(summary = "Booking Request list",
            description = "Depositors see their own requests; warehouse owners see requests for their warehouses; auditors see all.")
    @GetMapping
    public ApiResponse<PageResponse<BookingResponse>> search(@ParameterObject @Valid @ModelAttribute BookingRequests.Search search) {
        return ApiResponse.ok(bookings.search(currentUser.require(), search));
    }

    @Operation(summary = "One booking")
    @GetMapping("/{id}")
    public ApiResponse<BookingResponse> get(@PathVariable long id) { return ApiResponse.ok(bookings.get(currentUser.require(), id)); }

    @Operation(summary = "Ledger history of a booking")
    @GetMapping("/{id}/ledger")
    public ApiResponse<EntityProof> ledger(@PathVariable long id) { return ApiResponse.ok(bookings.history(currentUser.require(), id)); }

    @Operation(summary = "Accept a booking (warehouse owner)", description = "PENDING -> ACCEPTED. 409 INVALID_STATE otherwise.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/{id}/accept")
    public ApiResponse<BookingResponse> accept(@PathVariable long id, @Valid @RequestBody(required = false) BookingRequests.Decision body) {
        return ApiResponse.ok(bookings.accept(currentUser.require(), id, body == null ? null : body.note()));
    }

    @Operation(summary = "Reject a booking (warehouse owner)", description = "PENDING or ACCEPTED -> REJECTED.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/{id}/reject")
    public ApiResponse<BookingResponse> reject(@PathVariable long id, @Valid @RequestBody(required = false) BookingRequests.Decision body) {
        return ApiResponse.ok(bookings.reject(currentUser.require(), id, body == null ? null : body.note()));
    }

    @Operation(summary = "Cancel my booking (depositor)", description = "PENDING or ACCEPTED -> CANCELLED.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/{id}/cancel")
    public ApiResponse<BookingResponse> cancel(@PathVariable long id) { return ApiResponse.ok(bookings.cancel(currentUser.require(), id)); }

    @Operation(summary = "Record arrival of produce (warehouse owner)",
            description = "ACCEPTED -> DEPOSITED. Takes warehouse capacity, issues a receipt in PENDING_AUDIT and the first storage invoice.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/{id}/deposit")
    public ApiResponse<DepositResult> deposit(@PathVariable long id, @Valid @RequestBody(required = false) BookingRequests.Deposit body) {
        BookingRequests.Deposit request = body == null ? new BookingRequests.Deposit(null, null, null, null) : body;
        return ApiResponse.ok(bookings.deposit(currentUser.require(), id, request));
    }
}
