package ru.ngtu.sabacc.system.config.security;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @author Egor Bokov
 */
@Data
@ConfigurationProperties("security.cors")
public class CorsConfigProperties {
    private String allowedOrigin = "http://localhost:5173";
    private String allowedHeader = "*";
    private String allowedMethod = "*";
    private String configurationPattern = "/api/**";
}
