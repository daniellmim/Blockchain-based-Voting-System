package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
	"voting-blockchain/pkg/block"
	"voting-blockchain/pkg/consensus"
	"voting-blockchain/pkg/network"
	"voting-blockchain/pkg/storage"
)

var (
	roomStore   = storage.NewRoomStore()
	ballotStore = storage.NewBallotStore()
	nodeAddress = "http://localhost:8080" // Define the current node's address
)

// --- CORS middleware ---
func withCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // Or set to your frontend URL
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		handler(w, r)
	}
}

// Validate a specific ledger
func validateLedger(filename string) error {
	blockchain, err := block.LoadBlockchain(filename)
	if err != nil {
		return fmt.Errorf("failed to load blockchain from %s: %v", filename, err)
	}

	if !block.ValidateBlockchain(blockchain) {
		return fmt.Errorf("blockchain in %s is invalid or tampered with", filename)
	}

	return nil
}

// Create a new room
func createRoomHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RoomID      string `json:"roomId"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Type        string `json:"type"` // "public" or "private"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create a new room
	room, err := roomStore.CreateRoom(req.Name, req.Description, req.Type)
	if err != nil {
		http.Error(w, "Failed to create room", http.StatusInternalServerError)
		return
	}

	// Ensure the ledgers directory exists
	if _, err := os.Stat("ledgers"); os.IsNotExist(err) {
		err := os.Mkdir("ledgers", 0755)
		if err != nil {
			http.Error(w, "Failed to create ledgers directory", http.StatusInternalServerError)
			return
		}
	}

	// Initialize a new blockchain for the room using the provided roomId
	filename := fmt.Sprintf("./ledgers/blockchain-%s.json", req.RoomID)
	genesisBlock := block.CreateGenesisBlock()
	genesisBlock.Hash = consensus.ProofOfWork(genesisBlock)
	blockchain := []block.Block{*genesisBlock}
	if err := block.SaveBlockchain(filename, blockchain); err != nil {
		http.Error(w, "Failed to initialize blockchain", http.StatusInternalServerError)
		return
	}

	// Broadcast the room creation to all known nodes
	for _, peer := range network.KnownNodes {
		if peer != nodeAddress {
			network.SendRoom(peer, req.RoomID, blockchain)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(room)
}

// Create a new ballot in a room
func createBallotHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RoomID      string   `json:"roomId"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Options     []string `json:"options"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create a new ballot
	ballot, err := ballotStore.CreateBallot(req.RoomID, req.Title, req.Description, req.Options)
	if err != nil {
		http.Error(w, "Failed to create ballot", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ballot)
}

// Cast a vote in a ballot
func castVoteHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RoomID   string `json:"roomId"`
		BallotID string `json:"ballotId"`
		UserID   string `json:"userId"`
		ChoiceID string `json:"choiceId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Load the blockchain for the room
	filename := fmt.Sprintf("./ledgers/blockchain-%s.json", req.RoomID)
	blockchain, err := block.LoadBlockchain(filename)
	if err != nil {
		http.Error(w, "Failed to load blockchain", http.StatusInternalServerError)
		return
	}

	// Validate the ledger before adding a new block
	if err := validateLedger(filename); err != nil {
		log.Println(err) // Log the error for debugging
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create a new block for the vote
	lastBlock := blockchain[len(blockchain)-1]
	newBlock := block.Block{
		Index:     lastBlock.Index + 1,
		Timestamp: time.Now().Unix(),
		Data: block.VoteData{
			BallotID: req.BallotID,
			// UserID:   req.UserID,
			ChoiceID: req.ChoiceID,
		},
		PrevHash: lastBlock.Hash,
	}
	newBlock.Hash = consensus.ProofOfWork(&newBlock)

	// Validate the new block before appending
	if !block.ValidateBlock(&newBlock) {
		http.Error(w, "New block is invalid. Vote not casted.", http.StatusBadRequest)
		return
	}

	// Append the new block to the blockchain
	blockchain = append(blockchain, newBlock)
	if err := block.SaveBlockchain(filename, blockchain); err != nil {
		http.Error(w, "Failed to save blockchain", http.StatusInternalServerError)
		return
	}

	// Broadcast the new block to peers
	for _, peer := range network.KnownNodes {
		if peer != nodeAddress {
			network.SendBlock(peer, &newBlock)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newBlock)
}

// Get ballot results
func getResultsHandler(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("roomId")
	ballotID := r.URL.Query().Get("ballotId")

	// Load the blockchain for the room
	filename := fmt.Sprintf("./ledgers/blockchain-%s.json", roomID)
	blockchain, err := block.LoadBlockchain(filename)
	if err != nil {
		http.Error(w, "Failed to load blockchain", http.StatusInternalServerError)
		return
	}

	// Calculate vote counts
	results := make(map[string]int)
	for _, block := range blockchain {
		if block.Data.BallotID == ballotID {
			results[block.Data.ChoiceID]++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// Get the full blockchain ledger for a room
func getLedgerHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	roomID := r.URL.Query().Get("roomId")
	filename := fmt.Sprintf("./ledgers/blockchain-%s.json", roomID)
	blockchain, err := block.LoadBlockchain(filename)
	if err != nil {
		http.Error(w, "Failed to load blockchain", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(blockchain)
}

// Main starts the API server
func Main() {
	// Define API routes with CORS
	http.HandleFunc("/api/rooms", withCORS(createRoomHandler))
	http.HandleFunc("/api/ballots", withCORS(createBallotHandler))
	http.HandleFunc("/api/vote", withCORS(castVoteHandler))
	http.HandleFunc("/api/results", withCORS(getResultsHandler))
	http.HandleFunc("/api/ledger", withCORS(getLedgerHandler))

	// Start the server
	port := "8080"
	fmt.Printf("Server running on port %s\n", port)
	http.ListenAndServe(":"+port, nil)
}
