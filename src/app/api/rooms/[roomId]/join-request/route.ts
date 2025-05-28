
import dbConnect from '@/lib/mongodb';
import RoomModel from '@/models/Room';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

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
    return NextResponse.json({ message: 'Invalid Room ID' }, { status: 400 });
  }

  const requesterId = new Types.ObjectId(req.user.userId);

  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    if (room.visibility !== 'public') {
      return NextResponse.json({ message: 'Can only request to join public rooms' }, { status: 403 });
    }

    const isMember = room.members.some(member => member.userId.equals(requesterId));
    if (isMember) {
      return NextResponse.json({ message: 'You are already a member of this room' }, { status: 400 });
    }

    // Check for existing pending join request notification from this user to this admin for this room
    const existingRequestNotification = await NotificationModel.findOne({
        userId: room.adminId, // Notification is for the admin
        type: 'join_request_received',
        'data.roomId': room._id,
        'data.performerId': requesterId, // The user making the request
        // 'data.requestStatus': 'pending' // if we add this status to the notification data
    });

    if (existingRequestNotification && !existingRequestNotification.isRead) { // A simple check: if admin hasn't read it, it's likely pending
        return NextResponse.json({ message: 'A join request for this room is already pending admin approval.' }, { status: 409 }); // 409 Conflict
    }
    if (existingRequestNotification && existingRequestNotification.isRead && existingRequestNotification.data.requestStatus === 'pending') { // More robust check if we add requestStatus
        return NextResponse.json({ message: 'A join request for this room is already pending admin approval.' }, { status: 409 });
    }


    // Create a notification for the room admin
    await NotificationModel.create({
      userId: room.adminId, // Notification for the admin
      type: 'join_request_received',
      message: `${req.user.name || req.user.username} requested to join "${room.name}".`,
      data: {
        roomId: room._id,
        roomName: room.name,
        performerId: requesterId, // User who made the request
        performerName: req.user.name || req.user.username,
        targetUserId: requesterId, // For action handler to know who to add (the requester)
        requestStatus: 'pending', // Explicitly set status
      },
    });

    return NextResponse.json({ message: 'Join request sent successfully. Awaiting admin approval.' }, { status: 200 });

  } catch (error: any) {
    console.error(`Join Request Error for Room ${roomId}:`, error);
    return NextResponse.json({ message: 'Failed to send join request', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
  await dbConnect();
  const { roomId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(roomId)) {
    return NextResponse.json({ message: 'Invalid Room ID' }, { status: 400 });
  }

  const requesterId = new Types.ObjectId(req.user.userId);

  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      // It's okay if room doesn't exist, maybe it was deleted. The notification cleanup will just find nothing.
    }

    // Find and delete the "join_request_received" notification sent to the admin by this user for this room.
    const result = await NotificationModel.deleteOne({
      // userId: room?.adminId, // Notification was for the admin
      type: 'join_request_received',
      'data.roomId': new Types.ObjectId(roomId),
      'data.performerId': requesterId, // The user who made the original request
      // 'data.requestStatus': 'pending', // Optionally only allow cancelling pending requests
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'No active join request found to cancel, or it was already processed.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Join request cancelled successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`Cancel Join Request Error for Room ${roomId}:`, error);
    return NextResponse.json({ message: 'Failed to cancel join request', error: error.message }, { status: 500 });
  }
}
