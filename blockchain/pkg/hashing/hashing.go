package hashing

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"voting-blockchain/pkg/block" 
)

// GenerateHash takes in data as a string and returns its SHA-256 hash.
func GenerateHash(data string) string {
	hash := sha256.New()
	hash.Write([]byte(data))
	return hex.EncodeToString(hash.Sum(nil))
}

// HashVote generates a hash specific to a vote, based on voter ID, candidate, and signature.
func HashVote(voterID, candidate, signature string) string {
	data := voterID + candidate + signature
	return GenerateHash(data)
}

// HashBlock generates a hash for the block by taking in the block's unique properties.
func HashBlock(index int, timestamp, previousHash string, votes []string) string {
	data := fmt.Sprintf("%d%s%s%s", index, timestamp, previousHash, votes)
	return GenerateHash(data)
}

// CalculateHash computes the SHA-256 hash of a block's data
func CalculateHash(block *block.Block) string {
	blockData, _ := json.Marshal(block)
	hash := sha256.New()
	hash.Write(blockData)
	return fmt.Sprintf("%x", hash.Sum(nil))
}
