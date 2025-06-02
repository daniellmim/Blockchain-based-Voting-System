import axios from 'axios';

const BLOCKCHAIN_API_URL = 'http://localhost:8080';

// Create a room on the blockchain
export const createRoomOnBlockchain = async (roomId: string) => {
  try {
    const response = await axios.post(`${BLOCKCHAIN_API_URL}/api/rooms`, {
      roomId,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating room on blockchain:', error);
    throw error;
  }
};

// Create a ballot on the blockchain
export const createBallotOnBlockchain = async (
  roomId: string,
  ballotId: string,
  title: string,
  description: string,
  options: any[]
) => {
  try {
    const response = await axios.post(`${BLOCKCHAIN_API_URL}/api/ballots`, {
      roomId,
      title,
      description,
      options,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating ballot on blockchain:', error);
    throw error;
  }
};

// Cast a vote on the blockchain
export const castVoteOnBlockchain = async (
  roomId: string,
  ballotId: string,
  userId: string, // keep for function signature compatibility
  choiceId: string | number
) => {
  try {
    const response = await axios.post(`${BLOCKCHAIN_API_URL}/api/vote`, {
      roomId,
      ballotId,
      choiceId: String(choiceId),
    });
    return response.data;
  } catch (error) {
    console.error('Error casting vote on blockchain:', error);
    throw error;
  }
};

// Get ballot results from the blockchain
export const getResultsFromBlockchain = async (roomId: String, ballotId: String) => {
  try {
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/api/results`, {
      params: { roomId, ballotId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching results from blockchain:', error);
    throw error;
  }
};

// Check if blockchain is live (valid and not empty) for a room
export const isBlockchainLive = async (roomId: string): Promise<boolean> => {
  try {
    const res = await axios.get(`${BLOCKCHAIN_API_URL}/api/ledger?roomId=${roomId}`);
    const chain = res.data;
    // Consider blockchain live if it has at least 1 block and each block has required fields
    if (Array.isArray(chain) && chain.length > 0 && chain[0].hash && chain[0].index === 0) {
      // Optionally, more validation can be added here
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};
