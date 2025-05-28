package cryptography

import (
	"crypto/sha256"
	"encoding/hex"
)

// Hash data using SHA-256
func Hash(data string) string {
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// Sign data (placeholder for cryptographic signing)
func Sign(data string) string {
	// In a real implementation, use a private key to sign the data
	return Hash(data)
}

// Verify signature (placeholder for cryptographic verification)
func Verify(data, signature string) bool {
	// In a real implementation, use a public key to verify the signature
	return Hash(data) == signature
}