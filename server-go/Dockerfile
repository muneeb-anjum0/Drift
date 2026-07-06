FROM golang:1.26-alpine AS build

WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY server-go/go.mod server-go/go.sum ./
RUN go mod download
COPY server-go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/drift-api ./cmd/api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/drift-api /app/drift-api
EXPOSE 5000
CMD ["/app/drift-api"]
