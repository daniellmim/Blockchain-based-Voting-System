package consensus

import (
	"math/rand"
	"runtime"
	"strings"
	"sync"
	"time"
	"voting-blockchain/pkg/block"
)

var (
	difficulty      = 3 // Initial difficulty
	mutex           sync.Mutex
	miningStartTime time.Time
)

// adjustDifficulty dynamically adjusts the difficulty based on mining time
func adjustDifficulty(miningDuration time.Duration) {
	mutex.Lock()
	defer mutex.Unlock()

	if miningDuration < 10*time.Millisecond {
		difficulty++
	} else if miningDuration > 5*time.Second && difficulty > 1 {
		difficulty--
	}
}

// ProofOfWork performs the Proof of Work algorithm using multi-threading
func ProofOfWork(b *block.Block) string {
	miningStartTime = time.Now()
	numThreads := runtime.NumCPU()
	var wg sync.WaitGroup
	found := false
	var validHash string
	var validNonce int

	// Each thread starts with a random nonce
	rand.Seed(time.Now().UnixNano())

	for i := 0; i < numThreads; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			localBlock := *b // Create a local copy of the block to avoid modifying the original
			for !found {
				localBlock.Nonce = rand.Int()
				hash := block.CalculateHash(&localBlock)
				if strings.HasPrefix(hash, strings.Repeat("0", difficulty)) {
					mutex.Lock()
					if !found {
						found = true
						validHash = hash
						validNonce = localBlock.Nonce
					}
					mutex.Unlock()
					break
				}
			}
		}()
	}

	wg.Wait()

	// Update the original block with the valid hash and nonce
	b.Hash = validHash
	b.Nonce = validNonce

	// Adjust difficulty based on mining duration
	miningDuration := time.Since(miningStartTime)
	adjustDifficulty(miningDuration)

	return validHash
}

// ValidateProofOfWork checks if a block's hash meets the difficulty requirement
func ValidateProofOfWork(b *block.Block) bool {
	return strings.HasPrefix(b.Hash, strings.Repeat("0", difficulty))
}
