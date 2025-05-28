
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import RoomModel from '@/models/Room';
import PostModel from '@/models/Post';
import CommentModel from '@/models/Comment';
import BallotModel from '@/models/Ballot';
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

export async function DELETE(req: AuthenticatedRequest) {
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const userId = new Types.ObjectId(req.user.userId);

    // TODO: Implement more comprehensive data cleanup.
    // This is a basic cleanup. In a real app, consider:
    // - What happens to rooms where this user is the admin? (Delete them? Transfer ownership?)
    // - Anonymizing user's content vs. deleting it.
    // - Background jobs for cascading deletes if data is extensive.

    // For now:
    // 1. Delete user's posts
    await PostModel.deleteMany({ authorId: userId });
    // 2. Delete user's comments (or anonymize - here deleting)
    await CommentModel.deleteMany({ authorId: userId });
    // 3. Remove user from room member lists (and from ballot votedUserIds)
    await RoomModel.updateMany(
        { 'members.userId': userId },
        { $pull: { members: { userId: userId } } }
    );
    const userRooms = await RoomModel.find({ 'members.userId': userId }); // Get rooms user was part of
    for (const room of userRooms) {
        for (const ballotId of room.ballots) {
            const ballot = await BallotModel.findById(ballotId);
            if (ballot && ballot.votedUserIds.has(req.user.userId)) {
                ballot.votedUserIds.delete(req.user.userId);
                // Note: This doesn't decrement vote counts. A more robust solution would.
                await ballot.save();
            }
        }
    }
    // 4. Delete rooms where this user is the admin (simple approach, might need refinement)
    await RoomModel.deleteMany({ adminId: userId });
    // 5. Finally, delete the user
    await UserModel.findByIdAndDelete(userId);

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete Account Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
