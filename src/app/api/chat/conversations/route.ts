
import dbConnect from '@/lib/mongodb';
import ConversationModel from '@/models/Conversation';
import UserModel from '@/models/User';
import ChatMessageModel from '@/models/ChatMessage';
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
    const conversations = await ConversationModel.find({
      participants: new Types.ObjectId(req.user.userId),
    })
    .populate('participants', 'id name username avatarUrl')
    .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'id name username avatarUrl' }
    })
    .sort({ updatedAt: -1 }); // Sort by most recently updated

    // Further enrich conversations on the server
    const enrichedConversations = await Promise.all(conversations.map(async (convo) => {
        const otherParticipant = (convo.participants as any[]).find(p => p.id !== req.user!.userId);
        
        // Calculate unread count for the current user in this conversation
        const unreadCount = await ChatMessageModel.countDocuments({
            conversationId: convo._id,
            senderId: { $ne: new Types.ObjectId(req.user!.userId) }, // Messages not sent by current user
            isReadBy: { $nin: [new Types.ObjectId(req.user!.userId)] } // Current user has not read them
        });

        return {
            ...convo.toObject({ virtuals: true }),
            otherParticipant,
            unreadCount
        };
    }));


    return NextResponse.json({ conversations: enrichedConversations }, { status: 200 });
  } catch (error: any) {
    console.error('Get Conversations Error:', error);
    return NextResponse.json({ message: 'Failed to fetch conversations', error: error.message }, { status: 500 });
  }
}
