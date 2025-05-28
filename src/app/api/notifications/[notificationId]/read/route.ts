
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

export async function PUT(req: AuthenticatedRequest, { params }: { params: { notificationId: string } }) {
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
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(req.user.userId) },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ message: 'Notification not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification marked as read', notification }, { status: 200 });
  } catch (error: any) {
    console.error('Mark Notification Read Error:', error);
    return NextResponse.json({ message: 'Failed to mark notification as read', error: error.message }, { status: 500 });
  }
}
