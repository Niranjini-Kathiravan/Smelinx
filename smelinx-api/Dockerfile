# syntax=docker/dockerfile:1
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/smelinx ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app

# Copy binary
COPY --from=build /out/smelinx .

# Create data volume for SQLite
VOLUME ["/app/data"]

# Expose port
ENV PORT=8080
EXPOSE 8080

# Run as nonroot (65532 is nonroot user)
USER 65532:65532
ENTRYPOINT ["./smelinx"]
