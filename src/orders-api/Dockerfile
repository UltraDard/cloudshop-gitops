FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o orders-api .

FROM scratch
COPY --from=builder /app/orders-api /orders-api
EXPOSE 8083
ENTRYPOINT ["/orders-api"]
