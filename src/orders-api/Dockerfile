FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o orders-api .

FROM scratch
COPY --from=builder /app/orders-api /orders-api
EXPOSE 8083
ENTRYPOINT ["/orders-api"]
