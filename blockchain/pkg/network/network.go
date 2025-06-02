package network

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"io"
	"log"
	"net"
	"sync"
	"time"
	"voting-blockchain/pkg/block"
)

// Addr holds a list of node addresses.
type Addr struct {
	AddrList []string
}

// Room holds a blockchain state for a room.
type Room struct {
	RoomID     string
	Blockchain block.Blockchain
}

const (
	protocol      = "tcp"
	commandLength = 12 // Fixed command length
	udpPort       = 12345
	udpTrigger    = "\x00" // Discovery trigger
)

var (
	KnownNodes = []string{} // List of discovered nodes
	mutex      sync.Mutex   // Protects KnownNodes
)

// GetLocalIP returns the local IP address.
func GetLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		log.Fatalf("Error getting local IP: %v", err)
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
			return ipNet.IP.String()
		}
	}

	log.Fatal("No valid local IP found")
	return ""
}

// DiscoverNodes starts UDP discovery.
func DiscoverNodes(port string) {
	go udpReceiver(port)
	udpSender(port)
}

// udpReceiver listens for UDP broadcasts.
func udpReceiver(port string) {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", udpPort))
	if err != nil {
		log.Printf("Error resolving UDP: %v\n", err)
		return
	}

	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		log.Printf("Error listening on UDP: %v\n", err)
		return
	}
	defer conn.Close()

	buffer := make([]byte, 1024)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			log.Printf("Error reading UDP: %v\n", err)
			continue
		}

		data := string(buffer[:n])
		if data == udpTrigger {
			nodeAddr := fmt.Sprintf("%s:%s", remoteAddr.IP.String(), port)
			mutex.Lock()
			if !NodeIsKnown(nodeAddr) {
				KnownNodes = append(KnownNodes, nodeAddr)
				fmt.Printf("Discovered node: %s\n", nodeAddr)
			}
			mutex.Unlock()
		}
	}
}

// udpSender sends UDP broadcasts.
func udpSender(port string) {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("255.255.255.255:%d", udpPort))
	if err != nil {
		log.Printf("Error resolving broadcast: %v\n", err)
		return
	}

	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		log.Printf("Error dialing UDP: %v\n", err)
		return
	}
	defer conn.Close()

	for {
		_, err := conn.Write([]byte(udpTrigger))
		if err != nil {
			log.Printf("Error sending UDP: %v\n", err)
		}
		time.Sleep(5 * time.Second)
	}
}

// CmdToBytes converts a command to bytes.
func CmdToBytes(cmd string) []byte {
	var bytes [commandLength]byte
	for i, c := range cmd {
		if i < commandLength {
			bytes[i] = byte(c)
		} else {
			break
		}
	}
	return bytes[:]
}

// BytesToCmd converts bytes to a command.
func BytesToCmd(bytes []byte) string {
	var cmd []byte
	for _, b := range bytes {
		if b != 0x0 {
			cmd = append(cmd, b)
		} else {
			break
		}
	}
	return string(cmd)
}

// HandleConnection routes incoming data.
func HandleConnection(conn net.Conn, blockchain *[]block.Block) {
	defer conn.Close()
	request := make([]byte, 4096)
	_, err := conn.Read(request)
	if err != nil {
		log.Println("Error reading request:", err)
		return
	}

	command := BytesToCmd(request[:commandLength])
	switch command {
	case "addr":
		HandleAddr(request[commandLength:])
	case "block":
		handleBlock(request[commandLength:], blockchain)
	case "room":
		handleRoom(request[commandLength:])
	default:
		fmt.Println("Unknown command")
	}
}

// HandleAddr processes a list of node addresses.
func HandleAddr(payload []byte) {
	var buff bytes.Buffer
	buff.Write(payload)
	dec := gob.NewDecoder(&buff)

	var nodes Addr
	err := dec.Decode(&nodes)
	if err != nil {
		log.Println("Error decoding addr:", err)
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	for _, node := range nodes.AddrList {
		if !NodeIsKnown(node) && node != "" {
			KnownNodes = append(KnownNodes, node)
		}
	}

	// Share updated list with other nodes
	for _, node := range KnownNodes {
		if len(nodes.AddrList) > 0 && node != nodes.AddrList[0] {
			SendAddr(node)
		}
	}

	fmt.Println("Updated nodes:", KnownNodes)
}

// NodeIsKnown checks if a node is already known.
func NodeIsKnown(addr string) bool {
	for _, node := range KnownNodes {
		if node == addr {
			return true
		}
	}
	return false
}

// handleBlock processes and validates a block.
func handleBlock(payload []byte, blockchain *[]block.Block) {
	var buff bytes.Buffer
	buff.Write(payload)
	dec := gob.NewDecoder(&buff)

	var newBlock block.Block
	err := dec.Decode(&newBlock)
	if err != nil {
		log.Println("Error decoding block:", err)
		return
	}

	if !block.ValidateBlock(&newBlock) {
		fmt.Println("Invalid block. Ignored.")
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	if len(*blockchain) > 0 && newBlock.PrevHash != (*blockchain)[len(*blockchain)-1].Hash {
		fmt.Println("Block does not link to chain. Attempting to synchronize chain...")
		// TODO: Request the full blockchain from the sender and replace local chain if longer and valid
		// Example placeholder:
		// senderAddr := newBlock.SourceAddr // You may need to include sender info in the block/network message
		// receivedChain := RequestChainFromPeer(senderAddr)
		// if len(receivedChain) > len(*blockchain) && block.ValidateBlockchain(receivedChain) {
		//   *blockchain = receivedChain
		//   fmt.Println("Chain synchronized with peer.")
		// } else {
		//   fmt.Println("Received chain is not valid or not longer. Ignoring block.")
		// }
		return
	}

	*blockchain = append(*blockchain, newBlock)
	fmt.Println("Block added:", newBlock)
}

// handleRoom processes and saves a room's blockchain.
func handleRoom(payload []byte) {
	var buff bytes.Buffer
	buff.Write(payload)
	dec := gob.NewDecoder(&buff)

	var room Room
	err := dec.Decode(&room)
	if err != nil {
		log.Printf("Error decoding room: %v\n", err)
		return
	}

	filename := fmt.Sprintf("./ledgers/blockchain-%s.json", room.RoomID)
	err = block.SaveBlockchain(filename, room.Blockchain)
	if err != nil {
		log.Printf("Error saving blockchain: %v\n", err)
		return
	}

	fmt.Printf("Room '%s' saved.\n", room.RoomID)
}

// SendBlock sends a block to a peer.
func SendBlock(addr string, b *block.Block) {
	data := GobEncode(b)
	request := append(CmdToBytes("block"), data...)
	sendData(addr, request)
}

// SendAddr sends known nodes to a peer.
func SendAddr(addr string) {
	nodes := Addr{AddrList: append(KnownNodes, addr)}
	payload := GobEncode(nodes)
	request := append(CmdToBytes("addr"), payload...)
	sendData(addr, request)
}

// SendRoom sends a room's blockchain to a peer.
func SendRoom(addr, roomID string, blockchain block.Blockchain) {
	room := Room{RoomID: roomID, Blockchain: blockchain}
	payload := GobEncode(room)
	request := append(CmdToBytes("room"), payload...)
	sendData(addr, request)
}

// SendBlock sends a block to a peer
func sendData(addr string, data []byte) {
	conn, err := net.Dial(protocol, addr)
	if err != nil {
		fmt.Printf("Error connecting to %s: %v\n", addr, err)
		return
	}
	defer conn.Close()

	_, err = io.Copy(conn, bytes.NewReader(data))
	if err != nil {
		log.Println("Error sending data:", err)
	}
}

// GobEncode encodes data for transmission.
func GobEncode(data interface{}) []byte {
	var buff bytes.Buffer
	enc := gob.NewEncoder(&buff)
	err := enc.Encode(data)
	if err != nil {
		log.Panic(err)
	}
	return buff.Bytes()
}
