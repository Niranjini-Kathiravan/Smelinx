FROM golang:1.25 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o smelinx ./cmd/api

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /app/smelinx .
EXPOSE 8080
CMD ["./smelinx"]
