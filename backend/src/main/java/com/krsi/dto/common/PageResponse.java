package com.krsi.dto.common;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** One page of a list. {@code page} is zero-based. */
@Schema(description = "A page of results (page is zero-based)")
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <T> PageResponse<T> of(List<T> items, int page, int size, long totalItems) {
        int pages = size == 0 ? 0 : (int) ((totalItems + size - 1) / size);
        return new PageResponse<>(items, page, size, totalItems, pages);
    }
}
