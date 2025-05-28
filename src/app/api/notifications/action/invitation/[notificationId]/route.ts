
import dbConnect from '@/lib/mongodb';
import NotificationModel from '@/models/Notification';
import RoomModel from '@/models/Room';
import UserModel from '@/models/User';
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

// POST to accept or decline
export async function POST(req: AuthenticatedRequest, { params }: { params: { notificationId: string } }) {
  await dbConnect();
  const { notificationId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(notificationId)) {
    return NextResponse.json({ message: 'Invalid Notification ID' }, { status: 400 });
  }

  try {
    const { action } = await req.json() as { action: 'accept' | 'decline' }; // 'accept' or 'decline'
     if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    const notification = await NotificationModel.findById(notificationId);

    if (!notification || notification.type !== 'room_invitation' || !notification.data.roomId || !notification.data.invitedRole) {
      return NextResponse.json({ message: 'Invalid or processed invitation notification' }, { status: 400 });
    }
    // Ensure notification is for the current user
    if (!notification.userId.equals(req.user.userId)) {
      return NextResponse.json({ message: 'This invitation is not for you' }, { status: 403 });
    }

    const room = await RoomModel.findById(notification.data.roomId);
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    
    const inviter = await UserModel.findById(notification.data.performerId);


    if (action === 'accept') {
      // Add user to room members if not already a member
      if (!room.members.some(member => member.userId.equals(req.user!.userId))) {
        room.members.push({ userId: new Types.ObjectId(req.user!.userId), role: notification.data.invitedRole! });
        await room.save();
      }
      notification.isRead = true;
      notification.message = `You accepted the invitation to join ${room.name}.`;
      // notification.data.invitationStatus = 'accepted'; // if you add this field
      await notification.save();

      // Notify the inviter (room admin)
      if (inviter) {
          await NotificationModel.create({
            userId: inviter._id, // Inviter is admin or whoever sent it
            type: 'invitation_accepted',
            message: `${req.user.name || req.user.username} accepted your invitation to join room "${room.name}".`,
            data: {
              roomId: room._id,
              roomName: room.name,
              performerId: new Types.ObjectId(req.user.userId), // User who accepted
              performerName: req.user.name || req.user.username,
              targetUserId: inviter._id,
            },
          });
      }
      return NextResponse.json({ message: 'Invitation accepted successfully' }, { status: 200 });

    } else { // Decline
      notification.isRead = true;
      notification.message = `You declined the invitation to join ${room.name}.`;
      // notification.data.invitationStatus = 'declined'; // if you add this field
      await notification.save();

      // Notify the inviter (room admin)
      if (inviter) {
          await NotificationModel.create({
            userId: inviter._id,
            type: 'invitation_declined',
            message: `${req.user.name || req.user.username} declined your invitation to join room "${room.name}".`,
            data: {
              roomId: room._id,
              roomName: room.name,
              performerId: new Types.ObjectId(req.user.userId),
              performerName: req.user.name || req.user.username,
              targetUserId: inviter._id,
            },
          });
      }
      return NextResponse.json({ message: 'Invitation declined' }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Process Invitation Error:', error);
    return NextResponse.json({ message: 'Failed to process invitation', error: error.message }, { status: 500 });
  }
}
