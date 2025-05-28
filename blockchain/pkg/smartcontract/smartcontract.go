package smartcontract

import (
	"errors"
	"voting-blockchain/pkg/transaction"
)

// VotingSmartContract represents a basic voting contract.
type VotingSmartContract struct {
	Candidates []string
	Votes      map[string]int
}

// NewVotingSmartContract creates a new voting contract.
func NewVotingSmartContract(candidates []string) *VotingSmartContract {
	return &VotingSmartContract{
		Candidates: candidates,
		Votes:      make(map[string]int),
	}
}

// CastVote casts a vote for a candidate if the candidate exists.
func (vsc *VotingSmartContract) CastVote(t transaction.Transaction) error {
	if _, ok := vsc.Votes[t.Data]; ok {
		vsc.Votes[t.Data]++
		return nil
	}
	return errors.New("candidate does not exist")
}

// GetResults returns the vote count for each candidate.
func (vsc *VotingSmartContract) GetResults() map[string]int {
	return vsc.Votes
}