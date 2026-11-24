FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -B -q -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN mkdir -p /var/toeic/media && chown -R 10001:10001 /var/toeic/media
USER 10001
ENTRYPOINT ["java","-jar","/app/app.jar"]
