# ---- build stage ----
FROM golang:1.25-alpine AS build

# Install gcc for CGO (required by mysql driver)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Cache dependencies separately from source code
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/api

# ---- run stage ----
FROM alpine:3.21

# ca-certificates needed for HTTPS outbound calls (future use)
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=build /app/server .

EXPOSE 8080
CMD ["./server"]
