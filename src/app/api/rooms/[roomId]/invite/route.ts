
import dbConnect from '@/lib/mongodb';
import RoomModel from '@/models/Room';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import type { UserRole } from '@/lib/types';

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

  try {
    const { targetUsername, role } = await req.json() as { targetUsername: string, role: UserRole };
    if (!targetUsername || !role) {
      return NextResponse.json({ message: 'Target username and role are required' }, { status: 400 });
    }
    if (!['voter', 'candidate'].includes(role)) {
        return NextResponse.json({ message: 'Invalid role for invitation' }, { status: 400 });
    }

    const room = await RoomModel.findById(roomId);
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    // Only admin can invite
    if (!room.adminId.equals(req.user.userId)) {
      return NextResponse.json({ message: 'Only room admin can send invitations' }, { status: 403 });
    }

    const targetUser = await UserModel.findOne({ username: targetUsername.toLowerCase() });
    if (!targetUser) {
      return NextResponse.json({ message: `User @${targetUsername} not found` }, { status: 404 });
    }
    if (targetUser._id.equals(req.user.userId)) {
      return NextResponse.json({ message: 'You cannot invite yourself' }, { status: 400 });
    }

    const isAlreadyMember = room.members.some(member => member.userId.equals(targetUser._id));
    if (isAlreadyMember) {
      return NextResponse.json({ message: `${targetUser.name || targetUser.username} is already a member of this room` }, { status: 400 });
    }

    // Check for existing pending invitation notification for this user to this room
    const existingInvitation = await NotificationModel.findOne({
      'data.targetUserId': targetUser._id,
      'data.roomId': room._id,
      type: 'room_invitation',
      // 'data.invitationStatus': 'pending' // If you add this field
    });
    if (existingInvitation && !existingInvitation.isRead) { // Simple check if an unread invitation exists
        return NextResponse.json({ message: `An invitation has already been sent to ${targetUser.name || targetUser.username} for this room.` }, { status: 400 });
    }


    await NotificationModel.create({
      userId: targetUser._id, // Notification for the target user
      type: 'room_invitation',
      message: `${req.user.name || req.user.username} has invited you to join room "${room.name}" as a ${role}.`,
      data: {
        roomId: room._id,
        roomName: room.name,
        invitedRole: role,
        performerId: new Types.ObjectId(req.user.userId), // Inviter
        performerName: req.user.name || req.user.username,
        targetUserId: targetUser._id,
      },
    });

    return NextResponse.json({ message: `Invitation sent to ${targetUser.name || targetUser.username}` }, { status: 200 });

  } catch (error: any) {
    console.error('Send Invitation Error:', error);
    return NextResponse.json({ message: 'Failed to send invitation', error: error.message }, { status: 500 });
  }
}
