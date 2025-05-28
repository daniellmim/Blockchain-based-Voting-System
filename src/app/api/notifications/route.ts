
import dbConnect from '@/lib/mongodb';
import NotificationModel from '@/models/Notification';
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

export async function GET(req: AuthenticatedRequest) {
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const notifications = await NotificationModel.find({ userId: new Types.ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .limit(50) // Add pagination later if needed
      .populate('data.performerId', 'name username avatarUrl')
      .populate('data.roomId', 'name')
      .populate('data.postId', 'title')
      .populate('data.ballotId', 'title');
      
    const unreadCount = await NotificationModel.countDocuments({ userId: new Types.ObjectId(req.user.userId), isRead: false });

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error: any) {
    console.error('Get Notifications Error:', error);
    return NextResponse.json({ message: 'Failed to fetch notifications', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: AuthenticatedRequest) { // For "Mark all as read"
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    await NotificationModel.updateMany(
      { userId: new Types.ObjectId(req.user.userId), isRead: false },
      { $set: { isRead: true } }
    );
    return NextResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
  } catch (error: any) {
    console.error('Mark All Notifications Read Error:', error);
    return NextResponse.json({ message: 'Failed to mark all notifications as read', error: error.message }, { status: 500 });
  }
}
