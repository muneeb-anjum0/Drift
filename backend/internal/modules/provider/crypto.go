package provider

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const credentialKeyVersion = 1

var ErrMasterKeyUnavailable = errors.New("provider master key is unavailable")
var ErrCredentialInvalid = errors.New("provider credential cannot be decrypted")

type credentialCipher struct{ key []byte }

func newCredentialCipher(encoded string) (credentialCipher, error) {
	if encoded == "" {
		return credentialCipher{}, nil
	}
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(key) != 32 {
		return credentialCipher{}, ErrMasterKeyUnavailable
	}
	return credentialCipher{key: key}, nil
}

func (c credentialCipher) aead() (cipher.AEAD, error) {
	if len(c.key) != 32 {
		return nil, ErrMasterKeyUnavailable
	}
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

func credentialAAD(workspace, record primitive.ObjectID, providerType string) []byte {
	return []byte(fmt.Sprintf("drift-provider:v1:%s:%s:%s", workspace.Hex(), record.Hex(), providerType))
}

func (c credentialCipher) encrypt(workspace, record primitive.ObjectID, providerType, plaintext string) ([]byte, []byte, error) {
	aead, err := c.aead()
	if err != nil {
		return nil, nil, err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, nil, err
	}
	ciphertext := aead.Seal(nil, nonce, []byte(plaintext), credentialAAD(workspace, record, providerType))
	return ciphertext, nonce, nil
}

func (c credentialCipher) decrypt(workspace, record primitive.ObjectID, providerType string, ciphertext, nonce []byte, version int) (string, error) {
	if version != credentialKeyVersion {
		return "", ErrCredentialInvalid
	}
	aead, err := c.aead()
	if err != nil {
		return "", err
	}
	if len(nonce) != aead.NonceSize() {
		return "", ErrCredentialInvalid
	}
	plaintext, err := aead.Open(nil, nonce, ciphertext, credentialAAD(workspace, record, providerType))
	if err != nil {
		return "", ErrCredentialInvalid
	}
	return string(plaintext), nil
}
