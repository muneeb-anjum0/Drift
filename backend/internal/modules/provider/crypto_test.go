package provider

import (
	"bytes"
	"encoding/base64"
	"errors"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func testCipher(t *testing.T, value byte) credentialCipher {
	t.Helper()
	c, err := newCredentialCipher(base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{value}, 32)))
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestCredentialCipherRoundTripAndIsolation(t *testing.T) {
	workspace := primitive.NewObjectID()
	record := primitive.NewObjectID()
	c := testCipher(t, 7)
	one, nonceOne, err := c.encrypt(workspace, record, "openai_compatible", "test-token")
	if err != nil {
		t.Fatal(err)
	}
	two, nonceTwo, err := c.encrypt(workspace, record, "openai_compatible", "test-token")
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(nonceOne, nonceTwo) || bytes.Equal(one, []byte("test-token")) || bytes.Equal(one, two) {
		t.Fatal("credential encryption reused a nonce or exposed plaintext")
	}
	decrypted, err := c.decrypt(workspace, record, "openai_compatible", one, nonceOne, credentialKeyVersion)
	if err != nil || decrypted != "test-token" {
		t.Fatal("credential round trip failed")
	}
	for _, tc := range []struct {
		name       string
		c          credentialCipher
		workspace  primitive.ObjectID
		record     primitive.ObjectID
		kind       string
		ciphertext []byte
		nonce      []byte
		version    int
	}{
		{"wrong key", testCipher(t, 8), workspace, record, "openai_compatible", one, nonceOne, 1},
		{"wrong workspace", c, primitive.NewObjectID(), record, "openai_compatible", one, nonceOne, 1},
		{"wrong record", c, workspace, primitive.NewObjectID(), "openai_compatible", one, nonceOne, 1},
		{"wrong type", c, workspace, record, "local", one, nonceOne, 1},
		{"wrong version", c, workspace, record, "openai_compatible", one, nonceOne, 2},
		{"tampered nonce", c, workspace, record, "openai_compatible", one, bytes.Repeat([]byte{9}, len(nonceOne)), 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := tc.c.decrypt(tc.workspace, tc.record, tc.kind, tc.ciphertext, tc.nonce, tc.version); err == nil {
				t.Fatal("invalid credential accepted")
			}
		})
	}
	tampered := bytes.Clone(one)
	tampered[0] ^= 1
	if _, err := c.decrypt(workspace, record, "openai_compatible", tampered, nonceOne, 1); !errors.Is(err, ErrCredentialInvalid) {
		t.Fatal("tampered ciphertext accepted")
	}
}

func TestCipherRequiresExactly32ByteKey(t *testing.T) {
	for _, raw := range []string{"invalid", base64.StdEncoding.EncodeToString([]byte("short"))} {
		if _, err := newCredentialCipher(raw); err == nil {
			t.Fatal("invalid master key accepted")
		}
	}
	c, err := newCredentialCipher("")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := c.encrypt(primitive.NewObjectID(), primitive.NewObjectID(), "openai_compatible", "x"); !errors.Is(err, ErrMasterKeyUnavailable) {
		t.Fatal("missing master key did not fail closed")
	}
}
