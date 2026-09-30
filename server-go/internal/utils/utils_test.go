package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestTextHelpers(t *testing.T) {
	statements := SplitStatements("Users can log in. Admins can export reports\nSystem must be fast")
	if len(statements) != 3 {
		t.Fatalf("expected 3 statements, got %d", len(statements))
	}

	if !ContainsAny("System must support reports", []string{"support", "export"}) {
		t.Fatal("expected keyword match")
	}

	if score := Similarity("users export monthly reports", "monthly report export for users"); score < 0.5 {
		t.Fatalf("expected meaningful similarity, got %f", score)
	}
}

func TestSafeNames(t *testing.T) {
	if got := Slug("  Client Portal MVP!  "); got != "client-portal-mvp" {
		t.Fatalf("unexpected slug: %s", got)
	}

	if got := SafeFilename("../../Scope Brief?.pdf"); got != "Scope-Brief-.pdf" {
		t.Fatalf("unexpected filename: %s", got)
	}
}

func TestObjectID(t *testing.T) {
	id := primitive.NewObjectID()
	parsed, err := ObjectID(id.Hex())
	if err != nil {
		t.Fatalf("expected valid object id: %v", err)
	}
	if parsed != id {
		t.Fatalf("expected parsed id to match")
	}

	if _, err := ObjectID("not-an-id"); err != ErrInvalidID {
		t.Fatalf("expected ErrInvalidID, got %v", err)
	}
}

func TestPasswordHashing(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatalf("hash failed: %v", err)
	}
	if hash == "password123" {
		t.Fatal("password hash should not equal plaintext")
	}
	if !CheckPassword(hash, "password123") {
		t.Fatal("expected password to match hash")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("wrong password should not match hash")
	}
}

func TestJWTStrictValidation(t *testing.T) {
	secret := "0123456789abcdef0123456789abcdef"
	userID := primitive.NewObjectID()
	token, err := SignJWT(userID, "user@example.com", secret, 1)
	if err != nil {
		t.Fatalf("sign JWT: %v", err)
	}
	claims, err := ParseJWT(token, secret)
	if err != nil {
		t.Fatalf("parse valid JWT: %v", err)
	}
	if claims.UserID != userID.Hex() || claims.Subject != userID.Hex() {
		t.Fatalf("unexpected claims: %#v", claims)
	}

	now := time.Now()
	invalidClaims := Claims{
		UserID: userID.Hex(),
		Email:  "user@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   userID.Hex(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	noneToken := jwt.NewWithClaims(jwt.SigningMethodNone, invalidClaims)
	unsigned, err := noneToken.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("sign unsigned JWT: %v", err)
	}
	if _, err := ParseJWT(unsigned, secret); err == nil {
		t.Fatal("expected non-HS256 token to be rejected")
	}

	invalidClaims.Issuer = "another-service"
	wrongIssuer, err := jwt.NewWithClaims(jwt.SigningMethodHS256, invalidClaims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign wrong-issuer JWT: %v", err)
	}
	if _, err := ParseJWT(wrongIssuer, secret); err == nil {
		t.Fatal("expected token with wrong issuer to be rejected")
	}
}
