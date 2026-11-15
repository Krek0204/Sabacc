package ru.ngtu.sabacc.system.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.DefaultCorsProcessor;

import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigTest {
    @Test
    void preflightAcceptsConfiguredServerOriginAndRejectsOtherOrigins() throws Exception {
        var properties = new CorsConfigProperties();
        properties.setAllowedOrigin("https://sabacc.example.org");
        var source = new SecurityConfig().corsConfigurationSource(properties);

        var request = new MockHttpServletRequest("OPTIONS", "/api/v1/room/all");
        request.addHeader("Origin", "https://sabacc.example.org");
        request.addHeader("Access-Control-Request-Method", "GET");
        var response = new MockHttpServletResponse();

        assertTrue(new DefaultCorsProcessor().processRequest(
                source.getCorsConfiguration(request), request, response));
        assertEquals("https://sabacc.example.org", response.getHeader("Access-Control-Allow-Origin"));

        request = new MockHttpServletRequest("OPTIONS", "/api/v1/room/all");
        request.addHeader("Origin", "https://other.example.org");
        request.addHeader("Access-Control-Request-Method", "GET");
        response = new MockHttpServletResponse();
        assertFalse(new DefaultCorsProcessor().processRequest(
                source.getCorsConfiguration(request), request, response));
        assertEquals(403, response.getStatus());
    }
}
