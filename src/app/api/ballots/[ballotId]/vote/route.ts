import dbConnect from '@/lib/mongodb';
import BallotModel from '@/models/Ballot';
import RoomModel from '@/models/Room';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { castVoteOnBlockchain } from '@/lib/blockchainApi';

interface AuthenticatedRequest extends NextRequest {
  user?: { userId: string };
}

async function authenticate(req: AuthenticatedRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      req.user = decoded;
      return true;
    } catch (err) {
      console.error('[API_VOTE_AUTH] Token verification failed:', err);
      return false;
    }
  }
  console.log('[API_VOTE_AUTH] No or invalid auth header.');
  return false;
}

export async function POST(req: AuthenticatedRequest, { params }: { params: { ballotId: string } }) {
  console.log(`[API_VOTE_POST] Received request for ballotId: ${params.ballotId}`);
  await dbConnect();
  const { ballotId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    console.log('[API_VOTE_POST] Authentication failed or user not found in request.');
    return NextResponse.json({ message: 'Authentication required to vote' }, { status: 401 });
  }
  console.log(`[API_VOTE_POST] User ${req.user.userId} authenticated.`);

  if (!Types.ObjectId.isValid(ballotId)) {
    console.log(`[API_VOTE_POST] Invalid Ballot ID format: ${ballotId}`);
    return NextResponse.json({ message: 'Invalid Ballot ID format' }, { status: 400 });
  }
  
  const userId = req.user.userId; // String form of ObjectId
  console.log(`[API_VOTE_POST] Voter User ID: ${userId}`);

  try {
    const body = await req.json();
    const { choiceIdOrIds, roomId } = body;
    console.log(`[API_VOTE_POST] Request body parsed: choiceIdOrIds=${JSON.stringify(choiceIdOrIds)}, roomId=${roomId}`);

    if (!roomId || !Types.ObjectId.isValid(roomId)) {
        console.log(`[API_VOTE_POST] Invalid or missing Room ID: ${roomId}`);
        return NextResponse.json({ message: 'Valid Room ID is required' }, { status: 400 });
    }

    const ballot = await BallotModel.findById(ballotId);
    if (!ballot) {
      console.log(`[API_VOTE_POST] Ballot not found for ID: ${ballotId}`);
      return NextResponse.json({ message: 'Ballot not found' }, { status: 404 });
    }
    console.log(`[API_VOTE_POST] Ballot found. Title: ${ballot.title}`);

    if (!ballot.roomId.equals(new Types.ObjectId(roomId))) {
      console.log(`[API_VOTE_POST] Ballot does not belong to this room. Ballot's roomId: ${ballot.roomId}, Provided roomId: ${roomId}`);
      return NextResponse.json({ message: 'Ballot does not belong to this room' }, { status: 400 });
    }

    const room = await RoomModel.findById(roomId);
    if (!room) {
        console.log(`[API_VOTE_POST] Room not found for ID: ${roomId}`);
        return NextResponse.json({ message: 'Room not found, cannot verify membership.' }, { status: 404 });
    }
    // Fix: add type for member
    if (!room.members.some((member: { userId: any }) => member.userId.equals(new Types.ObjectId(userId)))) {
        console.log(`[API_VOTE_POST] User ${userId} is not a member of room ${roomId}`);
        return NextResponse.json({ message: 'You must be a member of the room to vote' }, { status: 403 });
    }
    console.log(`[API_VOTE_POST] User ${userId} is a member of room ${roomId}.`);

    const now = new Date();
    // Fix: ensure ballot.startTime and ballot.endTime are Date objects and not undefined
    let ballotStartTime: Date | undefined = undefined;
    let ballotEndTime: Date | undefined = undefined;
    if (ballot.startTime) {
      ballotStartTime = typeof ballot.startTime === 'string' ? new Date(ballot.startTime) : ballot.startTime;
    }
    if (ballot.endTime) {
      ballotEndTime = typeof ballot.endTime === 'string' ? new Date(ballot.endTime) : ballot.endTime;
    }
    if (ballot.startTime && ballotStartTime && ballotStartTime > now) {
      console.log(`[API_VOTE_POST] Voting has not started yet. Start time: ${ballot.startTime}`);
      return NextResponse.json({ message: 'Voting has not started yet' }, { status: 400 });
    }
    if (ballot.endTime && ballotEndTime && ballotEndTime < now) {
      console.log(`[API_VOTE_POST] Voting has ended. End time: ${ballot.endTime}`);
      return NextResponse.json({ message: 'Voting has ended' }, { status: 400 });
    }
    console.log('[API_VOTE_POST] Voting period check passed.');

    const newSelectedIdsArray = (Array.isArray(choiceIdOrIds) ? choiceIdOrIds : [choiceIdOrIds]).map(String);
    if (newSelectedIdsArray.length === 0 || newSelectedIdsArray.some(id => !id)) {
      console.log(`[API_VOTE_POST] No choice selected or invalid choice ID in array: ${JSON.stringify(newSelectedIdsArray)}`);
      return NextResponse.json({ message: 'No choice selected or invalid choice ID provided' }, { status: 400 });
    }
    if (newSelectedIdsArray.length > (ballot.maxChoicesPerVoter || 1)) {
      console.log(`[API_VOTE_POST] Too many choices selected. Max: ${ballot.maxChoicesPerVoter || 1}, Selected: ${newSelectedIdsArray.length}`);
      return NextResponse.json({ message: `You can select up to ${ballot.maxChoicesPerVoter || 1} choices` }, { status: 400 });
    }
    // Ensure all selected IDs actually correspond to choices in the ballot
    const ballotChoiceIds = ballot.choices.map(c => c.id.toString());
    if (!newSelectedIdsArray.every(id => ballotChoiceIds.includes(id))) {
        console.log(`[API_VOTE_POST] Invalid choice ID provided in ${JSON.stringify(newSelectedIdsArray)}. Valid choices: ${JSON.stringify(ballotChoiceIds)}`);
        return NextResponse.json({ message: 'Invalid choice ID provided' }, { status: 400 });
    }
    console.log(`[API_VOTE_POST] Choice validation passed for choices: ${JSON.stringify(newSelectedIdsArray)}`);

    const previousVote = ballot.votedUserIds.get(userId);
    console.log(`[API_VOTE_POST] User's previous vote (if any) for ballot ${ballotId}: ${JSON.stringify(previousVote)}`);
    
    // Prevent double voting: if user has already voted, reject
    if (previousVote) {
      return NextResponse.json({ message: 'You have already voted on this ballot.' }, { status: 409 });
    }

    newSelectedIdsArray.forEach(newChoiceIdString => {
        const choice = ballot.choices.find(c => c.id === newChoiceIdString);
        if (choice) {
            console.log(`[API_VOTE_POST] Found new choice to increment: ID=${choice.id}, Text='${choice.text}', CurrentVoteCount=${choice.voteCount}`);
            if (typeof choice.voteCount === 'number') {
                choice.voteCount += 1;
                console.log(`[API_VOTE_POST] Incremented vote for choice ${newChoiceIdString}. New count: ${choice.voteCount}`);
            } else {
                 // Initialize if it wasn't a number, or if it's a new choice perhaps?
                console.warn(`[API_VOTE_POST] Vote count for choice ${newChoiceIdString} is not a number. Initializing to 1. CurrentVoteCount: ${choice.voteCount}`);
                choice.voteCount = 1;
            }
        } else {
             console.warn(`[API_VOTE_POST] Could not find new choice with ID ${newChoiceIdString} in ballot.choices to increment vote.`);
        }
    });
    
    ballot.votedUserIds.set(userId, newSelectedIdsArray.length === 1 ? newSelectedIdsArray[0] : newSelectedIdsArray);
    console.log(`[API_VOTE_POST] Updated votedUserIds for user ${userId} in ballot ${ballotId}. New map: ${JSON.stringify(Array.from(ballot.votedUserIds.entries()))}`);

    // Explicitly mark modified paths for Mongoose
    ballot.markModified('choices');
    ballot.markModified('votedUserIds');

    console.log('[API_VOTE_POST] Attempting to save ballot...');
    await ballot.save();
    console.log('[API_VOTE_POST] Ballot saved successfully.');

    // Blockchain integration: cast vote on blockchain
    try {
      const blockchainRoomId = ballot.roomId.toString();
      if (Array.isArray(newSelectedIdsArray) && newSelectedIdsArray.length > 1) {
        // For multi-choice, cast a vote for each selected choice
        for (const choiceId of newSelectedIdsArray) {
          await castVoteOnBlockchain(blockchainRoomId, ballotId, userId, choiceId);
        }
        console.log('[API_VOTE_POST] Multi-choice votes cast on blockchain.');
      } else {
        // Single choice
        await castVoteOnBlockchain(blockchainRoomId, ballotId, userId, newSelectedIdsArray[0]);
        console.log('[API_VOTE_POST] Single vote cast on blockchain.');
      }
    } catch (err) {
      console.error('[API_VOTE_POST] Failed to cast vote on blockchain:', err);
    }

    return NextResponse.json({ message: 'Vote cast successfully', ballot }, { status: 200 });

  } catch (error: any) {
    console.error(`[API_VOTE_POST_ERROR] Vote Error for Ballot ${ballotId}:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to cast vote', error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
