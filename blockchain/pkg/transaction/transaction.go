package transaction

// Transaction represents a basic transaction structure.
type Transaction struct {
	Data      string // Data related to the transaction
	Timestamp int64  // Timestamp of the transaction
	Signature string // Digital signature for validation
}
