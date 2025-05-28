
import dbConnect from '@/lib/mongodb';
import RoomModel from '@/models/Room';
import PostModel from '@/models/Post';
import UserModel from '@/models/User';
import NotificationModel from '@/models/Notification';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface AuthenticatedRequest extends NextRequest {
  user?: { userId: string, name?: string, username?: string, avatarUrl?: string }; 
}

async function authenticate(req: AuthenticatedRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, name?: string, username?: string, avatarUrl?: string };
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
    return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
  }

  try {
    const room = await RoomModel.findById(roomId).populate('members.userId', 'name username');
    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    const member = room.members.find(m => (m.userId as any)._id.equals(new Types.ObjectId(req.user!.userId)));
    if (!member || !['admin', 'candidate'].includes(member.role)) {
      return NextResponse.json({ message: 'Only admins or candidates can create posts in this room' }, { status: 403 });
    }
    
    const { title, description, imageUrl } = await req.json();
    if (!title) {
      return NextResponse.json({ message: 'Post title is required' }, { status: 400 });
    }

    const newPost = new PostModel({
      roomId: room._id,
      authorId: new Types.ObjectId(req.user.userId),
      title,
      description,
      imageUrl, // Assuming this is a URL or data URI
      comments: [],
      likes: 0,
      views: 0, // TODO: Implement view tracking if needed
    });

    await newPost.save();
    room.posts.push(newPost._id);
    await room.save();

    // Notify other room members (excluding the author)
    const authorObjectId = new Types.ObjectId(req.user.userId);
    const membersToNotify = room.members.filter(m => !(m.userId as any)._id.equals(authorObjectId));

    for (const mem of membersToNotify) {
        await NotificationModel.create({
            userId: (mem.userId as any)._id,
            type: 'new_post',
            message: `${req.user.name || req.user.username} created a new post "${newPost.title}" in room "${room.name}".`,
            data: {
                roomId: room._id,
                roomName: room.name,
                postId: newPost._id,
                postTitle: newPost.title,
                performerId: authorObjectId,
                performerName: req.user.name || req.user.username,
            }
        });
    }

    const populatedPost = await PostModel.findById(newPost._id).populate('authorId', 'name username avatarUrl');

    return NextResponse.json({ message: 'Post created successfully', post: populatedPost }, { status: 201 });

  } catch (error: any) {
    console.error(`Create Post Error for Room ${roomId}:`, error);
    return NextResponse.json({ message: 'Failed to create post', error: error.message }, { status: 500 });
  }
}
