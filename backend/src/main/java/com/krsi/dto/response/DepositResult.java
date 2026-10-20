package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Produce received: the booking is DEPOSITED, a receipt is waiting for quality inspection, and the first storage invoice is issued")
public record DepositResult(BookingResponse booking, EnwrResponse receipt, FinanceResponses.Invoice invoice) {}
