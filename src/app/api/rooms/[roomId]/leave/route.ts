
import dbConnect from '@/lib/mongodb';
import RoomModel from '@/models/Room';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

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
    return NextResponse.json({ message: 'Invalid Room ID' }, { status: 400 });
  }

  const userIdToLeave = new Types.ObjectId(req.user.userId);

  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    if (room.adminId.equals(userIdToLeave)) {
      return NextResponse.json({ message: 'Admin cannot leave the room. Please delete the room or transfer ownership.' }, { status: 403 });
    }

    const memberIndex = room.members.findIndex(member => member.userId.equals(userIdToLeave));
    if (memberIndex === -1) {
      return NextResponse.json({ message: 'You are not a member of this room' }, { status: 400 });
    }

    room.members.splice(memberIndex, 1);
    await room.save();

    return NextResponse.json({ message: 'Successfully left the room' }, { status: 200 });

  } catch (error: any) {
    console.error(`Leave Room Error for Room ${roomId}:`, error);
    return NextResponse.json({ message: 'Failed to leave room', error: error.message }, { status: 500 });
  }
}
