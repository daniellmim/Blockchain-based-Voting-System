package storage

import (
	"github.com/google/uuid"
)

// Room represents a voting room
type Room struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	Type            string   `json:"type"` // "public" or "private"
	Participants    []string `json:"participants"`
	PendingRequests []string `json:"pendingRequests"`
}

// Ballot represents a voting ballot
type Ballot struct {
	ID          string   `json:"id"`
	RoomID      string   `json:"roomId"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Options     []string `json:"options"`
	Voters      []string `json:"voters"`
}

type RoomStore struct {
	rooms map[string]*Room
}

type BallotStore struct {
	ballots map[string]*Ballot
}

func NewRoomStore() *RoomStore {
	return &RoomStore{
		rooms: make(map[string]*Room),
	}
}

func NewBallotStore() *BallotStore {
	return &BallotStore{
		ballots: make(map[string]*Ballot),
	}
}

// Create a new room
func (s *RoomStore) CreateRoom(name, description, roomType string) (*Room, error) {
	room := &Room{
		ID:              uuid.New().String(),
		Name:            name,
		Description:     description,
		Type:            roomType,
		Participants:    []string{},
		PendingRequests: []string{},
	}
	s.rooms[room.ID] = room
	return room, nil
}

// Create a new ballot
func (s *BallotStore) CreateBallot(roomID, title, description string, options []string) (*Ballot, error) {
	ballot := &Ballot{
		ID:          uuid.New().String(),
		RoomID:      roomID,
		Title:       title,
		Description: description,
		Options:     options,
		Voters:      []string{},
	}
	s.ballots[ballot.ID] = ballot
	return ballot, nil
}