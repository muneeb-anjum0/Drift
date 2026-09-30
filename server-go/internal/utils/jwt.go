package utils

import (
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	jwtIssuer   = "driftledger-api"
	jwtAudience = "driftledger-web"
)

type Claims struct {
	UserID string `json:"id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func SignJWT(userID primitive.ObjectID, email, secret string, expiresHours int) (string, error) {
	claims := Claims{
		UserID: userID.Hex(),
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   userID.Hex(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiresHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseJWT(tokenString, secret string) (*Claims, error) {
	if strings.TrimSpace(tokenString) == "" || strings.TrimSpace(secret) == "" {
		return nil, errors.New("token and secret are required")
	}
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(_ *jwt.Token) (any, error) {
		return []byte(secret), nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(jwtIssuer),
		jwt.WithAudience(jwtAudience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid || claims.IssuedAt == nil || claims.UserID == "" || claims.Subject != claims.UserID || strings.TrimSpace(claims.Email) == "" {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
