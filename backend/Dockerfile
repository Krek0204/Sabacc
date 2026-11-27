FROM gradle:8.10.1-jdk21-alpine AS builder
WORKDIR /app
COPY --chown=gradle:gradle . .
# Версия совпадает с gradle-wrapper.properties; повторное скачивание с GitHub не нужно.
RUN --mount=type=cache,target=/home/gradle/.gradle gradle bootJar --no-daemon -Dorg.gradle.jvmargs=-Xmx512m

FROM eclipse-temurin:21-jdk-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
CMD ["java", "-jar", "app.jar"]
