import dbConnect from '@/lib/mongodb';
import ChatMessageModel from '@/models/ChatMessage';
import ConversationModel from '@/models/Conversation';
import UserModel from '@/models/User'; // Ensure User model is registered
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

export async function GET(req: AuthenticatedRequest, { params }: { params: { conversationId: string } }) {
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
    // Verify user is part of this conversation
    const conversation = await ConversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      participants: new Types.ObjectId(req.user.userId),
    });

    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found or access denied' }, { status: 404 });
    }

    const messages = await ChatMessageModel.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 }) // Oldest first
      .populate('senderId', 'id name username avatarUrl');
      // .limit(50); // Add pagination later

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    console.error('Get Messages Error:', error);
    return NextResponse.json({ message: 'Failed to fetch messages', error: error.message }, { status: 500 });
  }
}
