package com.krsi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Render's free plan sleeps a service after 15 minutes without inbound traffic, and GitHub's scheduled pings arrive
 * hours apart. So the app calls its own public URL every 5 minutes; the request comes back in through Render's edge
 * and counts as traffic. RENDER_EXTERNAL_URL is set by Render only, so this does nothing locally.
 * shortcut: costs ~744 of the 750 free hours a month, so keep only one free Render service; drop this on a paid plan.
 */
@Component
@EnableScheduling
public class KeepAwake {
    private static final Logger log = LoggerFactory.getLogger(KeepAwake.class);
    private final String url;
    private final RestClient http = RestClient.create();

    public KeepAwake(@Value("${RENDER_EXTERNAL_URL:}") String externalUrl) {
        this.url = externalUrl.isBlank() ? null : externalUrl + "/api/health";
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 300_000)
    public void ping() {
        if (url == null) return;
        try {
            http.get().uri(url).retrieve().toBodilessEntity();
        } catch (RuntimeException e) {
            log.warn("Keep-awake ping to {} failed: {}", url, e.toString()); // the next ping retries in 5 minutes
        }
    }
}
