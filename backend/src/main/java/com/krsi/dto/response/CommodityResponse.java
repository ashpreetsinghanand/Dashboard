package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A tradable commodity. Use these names in requests (e.g. 'Cardamom', 'Black Pepper')")
public record CommodityResponse(String name, String category, String imageUrl) {}
