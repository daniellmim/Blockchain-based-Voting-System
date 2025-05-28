
import dbConnect from '@/lib/mongodb';
import RoomModel, { IRoomDocument } from '@/models/Room';
import UserModel, { IUserDocument } from '@/models/User';
import PostModel from '@/models/Post'; 
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
    } catch (err: any) {
      console.warn('[API_ROOM_AUTH] Token verification failed:', err.message);
      return false;
    }
  }
  return false;
}

export async function GET(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
  console.log(`[API_GET_ROOM] Request received for roomId: ${params.roomId}`);
  await dbConnect();
  const { roomId } = params;

  if (!Types.ObjectId.isValid(roomId)) {
    console.log(`[API_GET_ROOM] Invalid Room ID format: ${roomId}`);
    return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
  }

  try {
    console.log(`[API_GET_ROOM] Attempting to find room with ID: ${roomId}`);
    // Increment views for posts in this room when the room is fetched
    // This is a simple way to track views. More sophisticated tracking might be needed for unique views.
    await PostModel.updateMany({ roomId: new Types.ObjectId(roomId) }, { $inc: { views: 1 } });


    const roomQuery = RoomModel.findById(roomId)
      .populate({
          path: 'adminId',
          select: 'name username avatarUrl email', 
      })
      .populate({
          path: 'members.userId',
          select: 'name username avatarUrl email',
      })
      .populate({
          path: 'posts',
          options: { sort: { createdAt: -1 } }, 
          populate: [
              { path: 'authorId', select: 'name username avatarUrl' },
              // Comments will be fetched separately by the client for each post
          ],
      })
      .populate({
          path: 'ballots',
          options: { sort: { createdAt: -1 } }, 
      });

    console.log(`[API_GET_ROOM] Executing roomQuery for roomId: ${roomId}`);
    const room: IRoomDocument | null = await roomQuery.exec();
    console.log(`[API_GET_ROOM] roomQuery.exec() completed.`);

    if (room) {
        const firstPost = room.posts && room.posts.length > 0 ? room.posts[0] : null;
        const firstPostIdString = firstPost && (firstPost as any)._id ? (firstPost as any)._id.toString() : 'N/A';
        
        console.log(`[API_GET_ROOM] Raw room object after exec (basic info):`, {
            id: room.id,
            name: room.name,
            adminId: room.adminId?._id?.toString() || 'N/A',
            membersCount: room.members?.length || 0,
            postsCount: room.posts?.length || 0,
            firstPostId: firstPostIdString,
            ballotsCount: room.ballots?.length || 0
        });
    } else {
        console.log(`[API_GET_ROOM] Room not found after exec for ID: ${roomId}`);
        return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }


    if (!room) {
      console.log(`[API_GET_ROOM] Room not found for ID: ${roomId}`);
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    console.log(`[API_GET_ROOM] Room found: ${room.name}. AdminId populated: ${!!room.adminId}, Members populated: ${room.members?.length}`);

    try {
      const isAuthenticated = await authenticate(req);
      const currentUserIdString = req.user?.userId;
      let currentUserIdObjectId: Types.ObjectId | undefined;
      if (currentUserIdString && Types.ObjectId.isValid(currentUserIdString)) {
          currentUserIdObjectId = new Types.ObjectId(currentUserIdString);
      }

      console.log(`[API_GET_ROOM] isAuthenticated: ${isAuthenticated}, currentUserIdString: ${currentUserIdString}`);

      const roomAdmin = room.adminId as IUserDocument | null;

      if (room.visibility === 'private') {
        if (!isAuthenticated || !currentUserIdObjectId) {
          console.log(`[API_GET_ROOM] Private room ${roomId} - Authentication required.`);
          return NextResponse.json({ message: 'Authentication required for private room' }, { status: 401 });
        }
        
        const isAdmin = roomAdmin && roomAdmin._id ? roomAdmin._id.equals(currentUserIdObjectId) : false;
        
        const isMember = room.members.some(member => {
          const memberUser = member.userId as IUserDocument | null;
          return memberUser && memberUser._id && memberUser._id.equals(currentUserIdObjectId);
        });
        
        console.log(`[API_GET_ROOM] Private room. Admin: ${isAdmin}, Member: ${isMember}`);

        if (!isMember && !isAdmin) {
          console.log(`[API_GET_ROOM] Private room ${roomId} - Access denied for user ${currentUserIdString}.`);
          return NextResponse.json({ message: 'Access denied to private room' }, { status: 403 });
        }
      }
      
      const isCurrentUserMemberOrAdmin = currentUserIdObjectId ? 
          (roomAdmin && roomAdmin._id ? roomAdmin._id.equals(currentUserIdObjectId) : false) || 
          room.members.some(member => {
            const memberUser = member.userId as IUserDocument | null;
            return memberUser && memberUser._id && memberUser._id.equals(currentUserIdObjectId);
          })
          : false;

      if (room.visibility === 'public' && (!isAuthenticated || !currentUserIdObjectId || !isCurrentUserMemberOrAdmin)) {
           console.log(`[API_GET_ROOM] Public room ${roomId} - Viewing as non-member or unauthenticated.`);
           const adminUser = room.adminId as IUserDocument | null;
           const publicRoomData = {
              id: room.id,
              _id: room._id.toString(),
              name: room.name,
              description: room.description,
              adminId: adminUser ? {
                  id: adminUser.id,
                  _id: adminUser._id.toString(),
                  name: adminUser.name,
                  username: adminUser.username,
                  avatarUrl: adminUser.avatarUrl
              } : null,
              members: room.members.map(m => {
                const memberUser = m.userId as IUserDocument | null;
                return {
                  userId: memberUser ? {
                      id: memberUser.id,
                      _id: memberUser._id.toString(),
                      name: memberUser.name,
                      username: memberUser.username,
                      avatarUrl: memberUser.avatarUrl
                  } : null,
                  role: m.role
                };
              }),
              tags: room.tags,
              visibility: room.visibility,
              votingSystem: room.votingSystem,
              rules: room.rules,
              createdAt: room.createdAt.toISOString(),
              updatedAt: room.updatedAt.toISOString(),
              posts: [], 
              ballots: [],
           };
           return NextResponse.json({ room: publicRoomData, type: 'VIEW_AS_NON_MEMBER_PUBLIC' }, { status: 200 });
      }

      console.log(`[API_GET_ROOM] Successfully preparing full room data for ${roomId} for user ${currentUserIdString || 'member/admin'}`);
      console.log(`[API_GET_ROOM] Attempting room.toObject()...`);
      const roomObject = room.toObject({ virtuals: true, getters: true });
      console.log(`[API_GET_ROOM] room.toObject() completed.`);
      return NextResponse.json({ room: roomObject }, { status: 200 });

    } catch (processingError: any) {
        console.error(`[API_GET_ROOM] Error processing room data for ${roomId}:`, processingError.message, processingError.stack);
        return NextResponse.json({ message: 'Error processing room data after fetch.', error: processingError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[API_GET_ROOM] FATAL Error fetching room ${roomId}:`, error.message, error.stack);
    return NextResponse.json({ message: 'Internal Server Error while fetching room details.', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
  console.log(`[API_PUT_ROOM] Request received for roomId: ${params.roomId}`);
  await dbConnect();
  const { roomId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    console.log(`[API_PUT_ROOM] Authentication required for roomId: ${roomId}`);
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }
  
  if (!Types.ObjectId.isValid(roomId)) {
    console.log(`[API_PUT_ROOM] Invalid Room ID format: ${roomId}`);
    return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
  }
  
  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      console.log(`[API_PUT_ROOM] Room not found for ID: ${roomId}`);
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    const roomAdminId = room.adminId as Types.ObjectId; 
    if (!roomAdminId.equals(new Types.ObjectId(req.user.userId))) { 
      console.log(`[API_PUT_ROOM] User ${req.user.userId} is not admin of room ${roomId}. Admin is ${room.adminId}`);
      return NextResponse.json({ message: 'Only the room admin can update the room' }, { status: 403 });
    }

    const updates = await req.json();
    console.log(`[API_PUT_ROOM] Updates received for room ${roomId}:`, updates);
    
    const allowedUpdates = ['name', 'description', 'visibility', 'votingSystem', 'tags', 'rules'];
    Object.keys(updates).forEach(key => {
        if(allowedUpdates.includes(key)) {
            (room as any)[key] = updates[key];
        }
    });

    const updatedRoomDoc = await room.save();
    console.log(`[API_PUT_ROOM] Room ${roomId} updated successfully.`);

    // Repopulate for the response
    const populatedRoom = await RoomModel.findById(updatedRoomDoc._id)
      .populate({ path: 'adminId', select: 'name username avatarUrl email' })
      .populate({ path: 'members.userId', select: 'name username avatarUrl email' });

    return NextResponse.json({ message: 'Room updated successfully', room: populatedRoom?.toObject({ virtuals: true }) }, { status: 200 });

  } catch (error: any) {
    console.error(`[API_PUT_ROOM] Error updating room ${roomId}:`, error.message, error.stack);
    if ((error as any).code === 11000 && (error as any).keyPattern?.name) {
      return NextResponse.json({ message: 'A room with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update room', error: error.message }, { status: 500 });
  }
}


export async function DELETE(req: AuthenticatedRequest, { params }: { params: { roomId: string } }) {
  console.log(`[API_DELETE_ROOM] Request received for roomId: ${params.roomId}`);
  await dbConnect();
  const { roomId } = params;

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    console.log(`[API_DELETE_ROOM] Authentication required for roomId: ${roomId}`);
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(roomId)) {
    console.log(`[API_DELETE_ROOM] Invalid Room ID format: ${roomId}`);
    return NextResponse.json({ message: 'Invalid Room ID format' }, { status: 400 });
  }

  try {
    const room = await RoomModel.findById(roomId);
    if (!room) {
      console.log(`[API_DELETE_ROOM] Room not found for ID: ${roomId}`);
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    const roomAdminId = room.adminId as Types.ObjectId;
    if (!roomAdminId.equals(new Types.ObjectId(req.user.userId))) {
      console.log(`[API_DELETE_ROOM] User ${req.user.userId} is not admin of room ${roomId}. Admin is ${room.adminId}`);
      return NextResponse.json({ message: 'Only the room admin can delete the room' }, { status: 403 });
    }

    // TODO: More comprehensive cleanup (associated Posts, Ballots, Comments, Notifications)
    await PostModel.deleteMany({ roomId: room._id });
    await BallotModel.deleteMany({ roomId: room._id });
    // Consider cascading deletes for comments if posts are deleted, etc.

    await RoomModel.deleteOne({ _id: new Types.ObjectId(roomId) });
    console.log(`[API_DELETE_ROOM] Room ${roomId} deleted successfully by admin ${req.user.userId}.`);

    return NextResponse.json({ message: 'Room deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`[API_DELETE_ROOM] Error deleting room ${roomId}:`, error.message, error.stack);
    return NextResponse.json({ message: 'Failed to delete room', error: error.message }, { status: 500 });
  }
}
