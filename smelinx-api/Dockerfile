# ---------- Build stage ----------
FROM golang:1.25-alpine AS build
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/bin/smelinx ./cmd/api

# ---------- Runtime stage ----------
FROM gcr.io/distroless/base-debian12
WORKDIR /app

# copy binary & certs/timezone
COPY --from=build /app/bin/smelinx /app/smelinx
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# SQLite data dir
VOLUME ["/app/data"]

ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/smelinx"]
