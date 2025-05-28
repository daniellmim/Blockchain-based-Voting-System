import dbConnect from '@/lib/mongodb';
import RoomModel from '@/models/Room';
import BallotModel from '@/models/Ballot';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { createBallotOnBlockchain } from '@/lib/blockchainApi';

interface AuthenticatedRequest extends NextRequest {
  user?: { userId: string, name?: string, username?: string };
}

async function authenticate(req: AuthenticatedRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, name?: string, username?: string };
      req.user = decoded;
      return true;
    } catch (err) { return false; }
  }
  return false;
}

export async function POST(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
  await dbConnect();
  const { roomId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }
  
  if (!Types.ObjectId.isValid(roomId)) {
    return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
  }

  try {
    const room = await RoomModel.findById(roomId).populate('members.userId', 'name username');
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    if (!room.adminId.equals(new Types.ObjectId(req.user.userId))) {
      return NextResponse.json({ message: 'Only the room admin can create ballots' }, { status: 403 });
    }
    
    const { title, choices, startTime, endTime, maxChoicesPerVoter } = await req.json();

    if (!title || !choices || !Array.isArray(choices) || choices.length < 2) {
      return NextResponse.json({ message: 'Ballot title and at least two choices are required' }, { status: 400 });
    }
    
    const ballotChoices = choices.map((choice: any) => ({ text: choice.text, voteCount: 0 }));

    const newBallot = new BallotModel({
      roomId: room._id,
      title,
      choices: ballotChoices,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      maxChoicesPerVoter: maxChoicesPerVoter || 1,
      votedUserIds: new Map(),
    });

    await newBallot.save();
    room.ballots.push(newBallot._id);
    await room.save();

    // Blockchain integration: create ballot on blockchain
    try {
      await createBallotOnBlockchain(
        room._id.toString(),
        newBallot._id.toString(),
        newBallot.title,
        '', // No description field in current model
        newBallot.choices.map((c: any) => c.text)
      );
      console.log('[API_BALLOT_POST] Ballot also created on blockchain.');
    } catch (err) {
      console.error('[API_BALLOT_POST] Failed to create ballot on blockchain:', err);
    }

    // Notify room members (excluding admin who created it)
    const adminId = new Types.ObjectId(req.user.userId);
    const membersToNotify = room.members.filter(m => !(m.userId as any)._id.equals(adminId));

    for (const member of membersToNotify) {
        await NotificationModel.create({
            userId: (member.userId as any)._id,
            type: 'new_ballot',
            message: `A new ballot "${newBallot.title}" has been created in room "${room.name}".`,
            data: {
                roomId: room._id,
                roomName: room.name,
                ballotId: newBallot._id,
                ballotTitle: newBallot.title,
                performerId: adminId,
                performerName: req.user.name || req.user.username,
            }
        });
    }
    
    return NextResponse.json({ message: 'Ballot created successfully', ballot: newBallot }, { status: 201 });

  } catch (error: any) {
    console.error(`Create Ballot Error for Room ${roomId}:`, error);
    return NextResponse.json({ message: 'Failed to create ballot', error: error.message }, { status: 500 });
  }
}

// GET all ballots for a room
export async function GET(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
    await dbConnect();
    const { roomId } = params;

    const isAuthenticated = await authenticate(req);
    if (!isAuthenticated || !req.user) {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(roomId)) {
        return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
    }

    try {
        const room = await RoomModel.findById(roomId);
        if (!room) {
            return NextResponse.json({ message: 'Room not found' }, { status: 404 });
        }
        // Ensure user is a member of the room to view ballots
        if (!room.members.some(member => member.userId.equals(new Types.ObjectId(req.user!.userId)))) {
            return NextResponse.json({ message: 'Access denied: You are not a member of this room.' }, { status: 403 });
        }

        const ballots = await BallotModel.find({ roomId: room._id }).sort({ createdAt: -1 });
        return NextResponse.json({ ballots }, { status: 200 });

    } catch (error: any) {
        console.error(`Get Ballots Error for Room ${roomId}:`, error);
        return NextResponse.json({ message: 'Failed to fetch ballots', error: error.message }, { status: 500 });
    }
}
