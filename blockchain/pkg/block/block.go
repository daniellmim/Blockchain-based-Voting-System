package block

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"time"
)

// Block structure
type Block struct {
	Index     int      `json:"index"`
	Timestamp int64    `json:"timestamp"`
	Data      VoteData `json:"data"`
	PrevHash  string   `json:"prevHash"`
	Hash      string   `json:"hash"`
	Nonce     int      `json:"nonce"`
}

// VoteData represents the data stored in a block
type VoteData struct {
	BallotID string `json:"ballotId"`
	// UserID   string `json:"userId"`
	ChoiceID string `json:"choiceId"`
}

// Blockchain is a slice of blocks
type Blockchain []Block

// NewBlock creates a new block
func NewBlock(index int, data VoteData, prevHash string) *Block {
	block := &Block{
		Index:     index,
		Timestamp: time.Now().Unix(),
		Data:      data,
		PrevHash:  prevHash,
		Nonce:     0,
	}
	return block
}

// CreateGenesisBlock creates the first block in the blockchain
func CreateGenesisBlock() *Block {
	return NewBlock(0, VoteData{
		BallotID: "genesis",
		// UserID: "system",
		ChoiceID: "genesis"}, "0")
}

// SaveBlockchain saves the blockchain to a file
func SaveBlockchain(filename string, blockchain Blockchain) error {
	fileContent, err := json.MarshalIndent(blockchain, "", "  ")
	if err != nil {
		return err
	}

	err = ioutil.WriteFile(filename, fileContent, 0644)
	if err != nil {
		return err
	}

	return nil
}

// LoadBlockchain loads the blockchain from a file
func LoadBlockchain(filename string) (Blockchain, error) {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return nil, fmt.Errorf("blockchain file does not exist")
	}

	fileContent, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var blockchain Blockchain
	err = json.Unmarshal(fileContent, &blockchain)
	if err != nil {
		return nil, err
	}

	return blockchain, nil
}

// ValidateBlock checks if a block's hash matches its calculated hash
func ValidateBlock(b *Block) bool {
	calculatedHash := CalculateHash(b)
	if b.Hash != calculatedHash {
		fmt.Printf("Block has been tampered with! Expected hash: %s, got: %s\n", b.Hash, calculatedHash)
		return false
	}
	return true
}

// CalculateHash calculates the hash of a block
func CalculateHash(b *Block) string {
	record := fmt.Sprintf("%d%d%v%s%d", b.Index, b.Timestamp, b.Data, b.PrevHash, b.Nonce)
	hash := sha256.Sum256([]byte(record))
	return fmt.Sprintf("%x", hash)
}

// ValidateBlockchain checks the integrity of the entire blockchain
func ValidateBlockchain(blockchain Blockchain) bool {
	for i := 1; i < len(blockchain); i++ {
		currentBlock := blockchain[i]
		previousBlock := blockchain[i-1]

		// Validate the current block's hash
		if !ValidateBlock(&currentBlock) {
			return false
		}

		// Validate the previous hash linkage
		if currentBlock.PrevHash != previousBlock.Hash {
			fmt.Printf("Block %d's previous hash does not match the previous block's hash\n", currentBlock.Index)
			return false
		}
	}
	return true
}
