
import dbConnect from '@/lib/mongodb';
import PostModel from '@/models/Post';
import CommentModel from '@/models/Comment';
import UserModel from '@/models/User'; // For populating author details
import NotificationModel from '@/models/Notification';
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


export async function POST(req: AuthenticatedRequest, { params }: { params: { postId: string } }) {
  await dbConnect();
  const { postId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required to comment' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Invalid Post ID format' }, { status: 400 });
  }

  try {
    const { content, parentCommentId } = await req.json();
    if (!content || content.trim() === "") {
      return NextResponse.json({ message: 'Comment content cannot be empty' }, { status: 400 });
    }
    
    const post = await PostModel.findById(postId).populate('authorId', 'name username'); // Populate post author for notifications
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    // TODO: Check if user is member of the room to which this post belongs (if comments are restricted by room membership)

    const commenterId = new Types.ObjectId(req.user.userId);
    const newComment = new CommentModel({
      authorId: commenterId,
      postId: post._id,
      content,
      parentId: parentCommentId ? new Types.ObjectId(parentCommentId) : null,
      replies: [],
    });
    await newComment.save();

    if (parentCommentId) {
      // If it's a reply, add it to the parent comment's replies array
      await CommentModel.findByIdAndUpdate(parentCommentId, { $push: { replies: newComment._id } });
    } else {
      // If it's a top-level comment, add it to the post's comments array
      post.comments.push(newComment._id);
      await post.save();
    }
    
    const populatedComment = await CommentModel.findById(newComment._id).populate('authorId', 'name username avatarUrl');

    // Create notifications
    // 1. Notify post author (if not the commenter)
    if (!post.authorId._id.equals(commenterId)) {
        await NotificationModel.create({
            userId: post.authorId._id,
            type: 'new_comment',
            message: `${req.user.name || req.user.username} commented on your post "${post.title}".`,
            data: {
                roomId: post.roomId,
                postId: post._id,
                postTitle: post.title,
                commentId: newComment._id,
                performerId: commenterId,
                performerName: req.user.name || req.user.username,
            }
        });
    }

    // 2. Notify parent comment author (if it's a reply and not self-reply)
    if (parentCommentId) {
        const parentComment = await CommentModel.findById(parentCommentId).populate('authorId', 'name');
        if (parentComment && !parentComment.authorId._id.equals(commenterId)) {
            await NotificationModel.create({
                userId: parentComment.authorId._id,
                type: 'new_comment', // Could be 'new_reply'
                message: `${req.user.name || req.user.username} replied to your comment.`,
                data: {
                    roomId: post.roomId,
                    postId: post._id,
                    postTitle: post.title, // For context
                    commentId: newComment._id, // The new reply
                    // parentCommentId: parentComment._id, // Could be useful
                    performerId: commenterId,
                    performerName: req.user.name || req.user.username,
                }
            });
        }
    }


    return NextResponse.json({ message: 'Comment added successfully', comment: populatedComment }, { status: 201 });

  } catch (error: any) {
    console.error(`Add Comment Error for Post ${postId}:`, error);
    return NextResponse.json({ message: 'Failed to add comment', error: error.message }, { status: 500 });
  }
}

// GET comments for a post
export async function GET(req: NextRequest, { params }: { params: { postId: string } }) {
    await dbConnect();
    const { postId } = params;

    if (!Types.ObjectId.isValid(postId)) {
        return NextResponse.json({ message: 'Invalid Post ID format' }, { status: 400 });
    }

    try {
        // Fetch top-level comments for the post
        const comments = await CommentModel.find({ postId: new Types.ObjectId(postId), parentId: null })
            .populate({
                path: 'authorId',
                select: 'id name username avatarUrl',
            })
            .populate({
                path: 'replies', // Populate the direct replies
                populate: { // Nested populate for author of replies
                    path: 'authorId',
                    select: 'id name username avatarUrl',
                },
                options: { sort: { createdAt: 1 } } // Sort replies oldest first
            })
            .sort({ createdAt: -1 }); // Sort top-level comments newest first

        // If you need deeper nesting for replies, you'd typically handle that on the client or with more complex queries.
        // For now, this gets top-level comments and their direct replies.
        
        // To get even deeper replies, you might need a recursive function or multiple queries.
        // This is a simplified example for fetching comments.
        async function populateRepliesRecursively(commentList: any[]): Promise<any[]> {
            for (let i = 0; i < commentList.length; i++) {
                if (commentList[i].replies && commentList[i].replies.length > 0) {
                    const populatedReplies = await CommentModel.find({ _id: { $in: commentList[i].replies } })
                        .populate({ path: 'authorId', select: 'id name username avatarUrl' })
                        .populate({ 
                            path: 'replies', 
                            populate: { path: 'authorId', select: 'id name username avatarUrl' },
                            options: { sort: { createdAt: 1 } } 
                        })
                        .sort({ createdAt: 1 });
                    commentList[i].replies = await populateRepliesRecursively(populatedReplies.map(r => r.toObject({virtuals:true})));
                }
            }
            return commentList;
        }
        
        const populatedComments = await populateRepliesRecursively(comments.map(c => c.toObject({virtuals:true})));


        return NextResponse.json({ comments: populatedComments }, { status: 200 });

    } catch (error: any) {
        console.error(`Get Comments Error for Post ${postId}:`, error);
        return NextResponse.json({ message: 'Failed to fetch comments', error: error.message }, { status: 500 });
    }
}
