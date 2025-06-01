
import dbConnect from '@/lib/mongodb';
import ChatMessageModel from '@/models/ChatMessage';
import ConversationModel from '@/models/Conversation';
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

// POST to mark messages as read
export async function POST(req: AuthenticatedRequest, { params }: { params: { conversationId: string } }) {
  await dbConnect();
  const { conversationId } = await params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ message: 'Invalid Conversation ID' }, { status: 400 });
  }

  try {
    const userIdObjectId = new Types.ObjectId(req.user.userId);

    // Verify user is part of this conversation
    const conversation = await ConversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      participants: userIdObjectId,
    });
    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Mark messages in this conversation as read by the current user
    // Only update messages not sent by the current user and not already in their isReadBy array
    const result = await ChatMessageModel.updateMany(
      {
        conversationId: conversation._id,
        senderId: { $ne: userIdObjectId }, // Not sent by me
        isReadBy: { $nin: [userIdObjectId] } // I haven't read them yet
      },
      { $addToSet: { isReadBy: userIdObjectId } } // Add current user to isReadBy
    );
    
    // TODO: Real-time: Notify sender that messages have been read if needed

    return NextResponse.json({ message: 'Messages marked as read', modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error: any) {
    console.error('Mark Messages Read Error:', error);
    return NextResponse.json({ message: 'Failed to mark messages as read', error: error.message }, { status: 500 });
  }
}
