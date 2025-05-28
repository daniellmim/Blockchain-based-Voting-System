
import dbConnect from '@/lib/mongodb';
import ChatMessageModel from '@/models/ChatMessage';
import ConversationModel from '@/models/Conversation';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification'; // For potential future new message notifications
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, name?:string, username?:string };
      req.user = decoded;
      return true;
    } catch (err) { return false; }
  }
  return false;
}

export async function POST(req: AuthenticatedRequest) {
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const { receiverId, content, conversationId: existingConversationId } = await req.json();
    if (!receiverId || !content) {
      return NextResponse.json({ message: 'Receiver ID and content are required' }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(receiverId)) {
        return NextResponse.json({ message: 'Invalid Receiver ID' }, { status: 400 });
    }
    if (req.user.userId === receiverId) {
        return NextResponse.json({ message: 'Cannot send messages to yourself' }, { status: 400 });
    }


    const senderId = new Types.ObjectId(req.user.userId);
    const receiverObjectId = new Types.ObjectId(receiverId);

    let conversation;
    if (existingConversationId && Types.ObjectId.isValid(existingConversationId)) {
        conversation = await ConversationModel.findById(existingConversationId);
    }
    
    if (!conversation) {
      // Find or create conversation
      conversation = await ConversationModel.findOneAndUpdate(
        {
          participants: { $all: [senderId, receiverObjectId], $size: 2 },
        },
        {
          $setOnInsert: { participants: [senderId, receiverObjectId] },
        },
        { upsert: true, new: true }
      );
    }
    
    if (!conversation) { // Should not happen with upsert true
        return NextResponse.json({ message: 'Could not find or create conversation' }, { status: 500 });
    }
    
    // Ensure current user is part of this conversation
    if (!conversation.participants.some(pId => pId.equals(senderId))) {
        return NextResponse.json({ message: 'You are not part of this conversation' }, { status: 403 });
    }


    const newMessage = new ChatMessageModel({
      conversationId: conversation._id,
      senderId: senderId,
      content: content,
      isReadBy: [senderId], // Sender has "read" it
    });
    await newMessage.save();

    // Update conversation's last message and updatedAt timestamp
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Populate sender details for the response
    const populatedMessage = await ChatMessageModel.findById(newMessage._id)
        .populate('senderId', 'id name username avatarUrl');

    // TODO: Real-time: Emit message via WebSockets to receiverId
    // TODO: Create a 'new_chat_message' notification for the receiverId (careful about spamming)

    return NextResponse.json({ message: 'Message sent successfully', chatMessage: populatedMessage, conversationId: conversation.id }, { status: 201 });

  } catch (error: any) {
    console.error('Send Message Error:', error);
    return NextResponse.json({ message: 'Failed to send message', error: error.message }, { status: 500 });
  }
}
