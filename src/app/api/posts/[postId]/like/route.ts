
import dbConnect from '@/lib/mongodb';
import PostModel from '@/models/Post';
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

// POST to like/unlike
export async function POST(req: AuthenticatedRequest, { params }: { params: { postId: string } }) {
  await dbConnect();
  const { postId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required to like a post' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Invalid Post ID format' }, { status: 400 });
  }

  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    const userIdObjectId = new Types.ObjectId(req.user.userId);
    const userIndexInLikedBy = post.likedBy.findIndex(id => id.equals(userIdObjectId));

    let liked = false;
    if (userIndexInLikedBy > -1) {
      // User already liked, so unlike
      post.likedBy.splice(userIndexInLikedBy, 1);
      liked = false;
    } else {
      // User has not liked, so like
      post.likedBy.push(userIdObjectId);
      liked = true;
    }
    post.likes = post.likedBy.length; // Update likes count directly
    await post.save();
    
    // Populate author for the response, consistent with how posts are generally fetched
    const populatedPost = await PostModel.findById(post._id).populate('authorId', 'name username avatarUrl');

    return NextResponse.json({ message: liked ? 'Post liked successfully' : 'Post unliked successfully', post: populatedPost, liked }, { status: 200 });

  } catch (error: any) {
    console.error(`Like Post Error for Post ${postId}:`, error);
    return NextResponse.json({ message: 'Failed to update like status', error: error.message }, { status: 500 });
  }
}
