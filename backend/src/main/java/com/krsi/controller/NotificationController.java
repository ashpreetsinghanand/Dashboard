package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.response.NotificationResponses;
import com.krsi.security.CurrentUser;
import com.krsi.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = OpenApiConfig.TAG_NOTIFICATIONS)
public class NotificationController {
    private final NotificationService notifications;
    private final CurrentUser currentUser;

    public NotificationController(NotificationService notifications, CurrentUser currentUser) {
        this.notifications = notifications;
        this.currentUser = currentUser;
    }

    @Operation(summary = "My notifications", description = "Newest first, with the unread count. The UI polls this.")
    @GetMapping
    public ApiResponse<NotificationResponses.Feed> feed(@RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(notifications.feed(currentUser.require(), limit));
    }

    @Operation(summary = "Mark one notification read")
    @PostMapping("/{id}/read")
    public ApiResponse<NotificationResponses.Feed> read(@PathVariable long id) {
        notifications.markRead(currentUser.require(), id);
        return ApiResponse.ok(notifications.feed(currentUser.require(), 20));
    }

    @Operation(summary = "Mark all my notifications read")
    @PostMapping("/read-all")
    public ApiResponse<NotificationResponses.Feed> readAll() {
        notifications.markAllRead(currentUser.require());
        return ApiResponse.ok(notifications.feed(currentUser.require(), 20));
    }
}
