package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"os"
	"strings"
	"sync"
	"time"
	"voting-blockchain/cmd/api" // Correct import path for the API package
	"voting-blockchain/pkg/block"
	"voting-blockchain/pkg/consensus"
	"voting-blockchain/pkg/network"
)

var (
	blockchain  []block.Block
	peers       []string
	nodeAddress string
	mutex       sync.Mutex
)

// Load blockchain from a specific ledger file
func loadBlockchain(filename string) ([]block.Block, error) {
	file, err := ioutil.ReadFile(filename)
	if err != nil {
		// If the file doesn't exist, create a new blockchain with a genesis block
		if err.Error() == "open "+filename+": no such file or directory" {
			fmt.Println("No existing blockchain found, creating a new one with a genesis block.")
			genesisBlock := block.CreateGenesisBlock()
			genesisBlock.Hash = consensus.ProofOfWork(genesisBlock)
			blockchain := []block.Block{*genesisBlock}
			err := block.SaveBlockchain(filename, blockchain)
			if err != nil {
				return nil, err
			}
			return blockchain, nil
		}
		return nil, err
	}

	// If the file exists but is empty, create a new blockchain with a genesis block
	if len(file) == 0 {
		fmt.Println("Blockchain file is empty, creating a new one with a genesis block.")
		genesisBlock := block.CreateGenesisBlock()
		genesisBlock.Hash = consensus.ProofOfWork(genesisBlock)
		blockchain := []block.Block{*genesisBlock}
		err := block.SaveBlockchain(filename, blockchain)
		if err != nil {
			return nil, err
		}
		return blockchain, nil
	}

	// Load the blockchain from the file
	var blockchain []block.Block
	err = json.Unmarshal(file, &blockchain)
	if err != nil {
		return nil, err
	}

	// Validate the blockchain after loading
	if !block.ValidateBlockchain(blockchain) {
		return nil, fmt.Errorf("blockchain is invalid or tampered with")
	}

	return blockchain, nil
}

// Save the blockchain to a specific ledger file
func saveBlockchain(filename string, blockchain []block.Block) error {
	data, err := json.MarshalIndent(blockchain, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(filename, data, 0644)
}

// Create a new block and add it to the blockchain
func castVote(filename, ballotID, userID, choiceID string) {
	// Load the blockchain from the file
	blockchain, err := loadBlockchain(filename)
	if err != nil {
		fmt.Println("Error loading blockchain:", err)
		return
	}

	// Get the latest block (previous block)
	lastBlock := blockchain[len(blockchain)-1]

	// Create a new block for the vote
	newBlock := block.Block{
		Index:     lastBlock.Index + 1,
		Timestamp: time.Now().Unix(),
		Data: block.VoteData{
			BallotID: ballotID,
			// UserID:   userID,
			ChoiceID: choiceID,
		},
		PrevHash: lastBlock.Hash,
	}

	// Perform Proof of Work to get the hash for the new block
	newBlock.Hash = consensus.ProofOfWork(&newBlock)

	// Validate the new block before appending
	if !block.ValidateBlock(&newBlock) {
		fmt.Println("New block is invalid. Vote not casted.")
		return
	}

	// Append the new block to the blockchain
	blockchain = append(blockchain, newBlock)

	// Validate the entire blockchain after adding the new block
	if !block.ValidateBlockchain(blockchain) {
		fmt.Println("Blockchain is invalid or tampered with. Vote not casted.")
		return
	}

	// Save the updated blockchain back to the file
	err = saveBlockchain(filename, blockchain)
	if err != nil {
		fmt.Println("Error saving blockchain:", err)
		return
	}

	// Output the new block details
	fmt.Println("Vote casted successfully!")
	fmt.Printf("New Block Created: Index: %d, BallotID: %s, UserID: %s, ChoiceID: %s, Hash: %s\n",
		newBlock.Index, newBlock.Data.BallotID,
		// newBlock.Data.UserID,
		newBlock.Data.ChoiceID, newBlock.Hash)
}

func handleConnection(conn net.Conn) {
	defer conn.Close()
	network.HandleConnection(conn, &blockchain)
}

func broadcastBlock(newBlock block.Block) {
	for _, peer := range peers {
		if peer != nodeAddress {
			network.SendBlock(peer, &newBlock)
		}
	}
}

func broadcastAddr() {
	for _, peer := range network.KnownNodes {
		if peer != nodeAddress {
			network.SendAddr(peer)
		}
	}
}

func startNodeDiscovery(port string) {
	stopDiscovery := make(chan bool)
	var loadingMutex sync.Mutex
	loading := true

	go func() {
		reader := bufio.NewReader(os.Stdin)
		for {
			input, _ := reader.ReadString('\n')
			if strings.TrimSpace(input) == "R" {
				stopDiscovery <- true
			}
		}
	}()

	go func() {
		for {
			loadingMutex.Lock()
			if !loading {
				loadingMutex.Unlock()
				return
			}
			loadingMutex.Unlock()

			for i := 0; i <= 3; i++ {
				fmt.Printf("\rScanning for nodes on the network%s   ", strings.Repeat(".", i))
				time.Sleep(500 * time.Millisecond)
			}
		}
	}()

	for {
		network.DiscoverNodes(port)
		if len(network.KnownNodes) > 0 {
			loadingMutex.Lock()
			loading = false
			loadingMutex.Unlock()
			fmt.Printf("\n\nDiscovered nodes: %v\n", network.KnownNodes) // Move to a new line after discovery
			return
		}

		select {
		case <-stopDiscovery:
			loadingMutex.Lock()
			loading = false
			loadingMutex.Unlock()
			fmt.Println("\nStopped scanning for nodes.") // Move to a new line after stopping
			return
		case <-time.After(1 * time.Minute): // Stop after 1 minute if no nodes are found
			loadingMutex.Lock()
			loading = false
			loadingMutex.Unlock()
			fmt.Println("\nNo nodes found on the network.") // Move to a new line after timeout
			return
		}
	}
}

func startServer(port string) {
	nodeAddress = fmt.Sprintf("%s:%s", network.GetLocalIP(), port)
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		fmt.Println("Error starting server:", err)
		return
	}
	defer listener.Close()

	fmt.Println("Server started on port", port)

	// Start node discovery in a separate goroutine
	go startNodeDiscovery(port)

	for {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Error accepting connection:", err)
			continue
		}
		go handleConnection(conn)
	}
}

func main() {
	// Initialize blockchain with genesis block
	genesisBlock := block.CreateGenesisBlock()
	genesisBlock.Hash = consensus.ProofOfWork(genesisBlock)
	blockchain = append(blockchain, *genesisBlock)

	// Start P2P server
	go startServer("8594")

	// Start the API server
	fmt.Println("Starting the API server...")
	api.Main() // Call the main function of the API
}
