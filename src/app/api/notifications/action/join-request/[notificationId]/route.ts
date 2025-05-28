
import dbConnect from '@/lib/mongodb';
import NotificationModel, { INotificationDocument } from '@/models/Notification';
import RoomModel from '@/models/Room';
import UserModel from '@/models/User';
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

// POST to approve or decline
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
    const { action } = await req.json() as { action: 'approve' | 'decline' }; // 'approve' or 'decline'
    if (!['approve', 'decline'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    const notification = await NotificationModel.findById(notificationId);

    if (!notification || notification.type !== 'join_request_received' || !notification.data.roomId || !notification.data.targetUserId) {
      return NextResponse.json({ message: 'Invalid or processed notification' }, { status: 400 });
    }
    // Ensure the authenticated user is the admin of the room mentioned in the notification
    const room = await RoomModel.findById(notification.data.roomId);
    if (!room || !room.adminId.equals(req.user.userId)) {
      return NextResponse.json({ message: 'Unauthorized: Only room admin can process this request' }, { status: 403 });
    }
    if (notification.userId.toString() !== req.user.userId) { // Notif must be for current user (admin)
        return NextResponse.json({ message: 'Notification not intended for this user' }, { status: 403 });
    }


    const requesterId = notification.data.targetUserId;
    const requester = await UserModel.findById(requesterId);
    if (!requester) {
        return NextResponse.json({ message: 'Requester not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Add user to room members if not already a member
      if (!room.members.some(member => member.userId.equals(requesterId))) {
        room.members.push({ userId: requesterId, role: 'voter' }); // Default to voter
        await room.save();
      }
      // Update this notification (for admin)
      notification.isRead = true;
      notification.message = `You approved ${requester.name || requester.username}'s request to join ${room.name}.`;
      // notification.data.requestStatus = 'approved'; // Custom field if you add it
      await notification.save();

      // Create notification for the requester
      await NotificationModel.create({
        userId: requesterId,
        type: 'join_request_approved',
        message: `Your request to join room "${room.name}" has been approved.`,
        data: {
          roomId: room._id,
          roomName: room.name,
          performerId: room.adminId, // Admin approved
          performerName: (await UserModel.findById(room.adminId))?.name || 'Admin'
        },
      });
      return NextResponse.json({ message: 'Join request approved successfully' }, { status: 200 });

    } else { // Decline
      notification.isRead = true;
      notification.message = `You declined ${requester.name || requester.username}'s request to join ${room.name}.`;
      // notification.data.requestStatus = 'declined'; // Custom field if you add it
      await notification.save();

      // Optionally, notify the requester about the decline
      await NotificationModel.create({
        userId: requesterId,
        type: 'join_request_declined',
        message: `Your request to join room "${room.name}" has been declined.`,
        data: {
          roomId: room._id,
          roomName: room.name,
          performerId: room.adminId,
        },
      });
      return NextResponse.json({ message: 'Join request declined' }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Process Join Request Error:', error);
    return NextResponse.json({ message: 'Failed to process join request', error: error.message }, { status: 500 });
  }
}
