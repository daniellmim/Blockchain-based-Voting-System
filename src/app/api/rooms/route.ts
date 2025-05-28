import dbConnect from '@/lib/mongodb';
import RoomModel, { IRoomDocument } from '@/models/Room';
import UserModel from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { createRoomOnBlockchain } from '@/lib/blockchainApi';

interface AuthenticatedRequest extends NextRequest {
  user?: { userId: string }; // Add user property
}

// Middleware to verify JWT (simplified for this example)
async function authenticate(req: AuthenticatedRequest) {
  console.log("[API_ROOMS_AUTH] Authenticating request...");
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      req.user = decoded; // Attach user to request
      console.log("[API_ROOMS_AUTH] Authentication successful for user:", decoded.userId);
      return true;
    } catch (err: any) {
      console.warn("[API_ROOMS_AUTH] Token verification failed:", err.message);
      return false; // Token invalid or expired
    }
  }
  console.log("[API_ROOMS_AUTH] No valid token found.");
  return false; // No token
}


export async function GET(req: NextRequest) {
  console.log("[API_ROOMS_GET] Received GET request for rooms.");
  await dbConnect();
  try {
    let roomsQuery;
    const tempReq = req as AuthenticatedRequest; 
    const isAuthenticated = await authenticate(tempReq);

    if (isAuthenticated && tempReq.user?.userId) {
      console.log("[API_ROOMS_GET] User is authenticated. Fetching public rooms and user's private/member rooms.");
      const userId = new Types.ObjectId(tempReq.user.userId);
      
      const queryConditions = [
        { visibility: 'public' }, // All public rooms
        { // Private rooms where user is admin or member
          visibility: 'private',
          $or: [
            { adminId: userId },
            { 'members.userId': userId }
          ]
        }
      ];
      
      console.log("[API_ROOMS_GET] Mongoose query conditions:", JSON.stringify({ $or: queryConditions }, null, 2));
      roomsQuery = RoomModel.find({ $or: queryConditions });

    } else {
      console.log("[API_ROOMS_GET] User is not authenticated. Fetching only public rooms.");
      roomsQuery = RoomModel.find({ visibility: 'public' });
    }
    
    const rooms = await roomsQuery
      .populate({ path: 'adminId', select: 'id name username avatarUrl' })
      .populate({ path: 'members.userId', select: 'id name username avatarUrl' }) 
      .sort({ createdAt: -1 })
      .lean(); 

    console.log(`[API_ROOMS_GET] Fetched ${rooms.length} rooms from DB based on query.`);
    
    const processedRooms = rooms.map(room => {
        const admin = room.adminId as any; 
        const members = (room.members as any[] || []).map(mem => { 
            const memberUser = mem.userId as any;
            return {
                userId: memberUser ? {
                    id: memberUser._id?.toString(), 
                    _id: memberUser._id?.toString(),
                    name: memberUser.name,
                    username: memberUser.username,
                    avatarUrl: memberUser.avatarUrl,
                } : null,
                role: mem.role
            };
        });

        return {
            ...room,
            id: room._id.toString(), 
            _id: room._id.toString(),
            adminId: admin ? {
                id: admin._id?.toString(),
                _id: admin._id?.toString(),
                name: admin.name,
                username: admin.username,
                avatarUrl: admin.avatarUrl
            } : null,
            members: members,
            createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : undefined,
            updatedAt: room.updatedAt ? new Date(room.updatedAt).toISOString() : undefined,
        };
    });

    console.log("[API_ROOMS_GET] Successfully processed rooms. Sending response.");
    return NextResponse.json({ rooms: processedRooms }, { status: 200 });
  } catch (error: any) {
    console.error("[API_ROOMS_GET_ERROR] Error fetching rooms:", error.message, error.stack);
    return NextResponse.json({ message: 'Failed to fetch rooms', error: error.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: AuthenticatedRequest) {
  console.log("[API_ROOMS_POST] Received POST request to create room.");
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    console.log("[API_ROOMS_POST] Authentication failed or missing user.");
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }
  
  try {
    const { name, description, visibility, votingSystem, tags, rules, candidateUsernames } = await req.json();
    const adminId = new Types.ObjectId(req.user.userId);
    console.log(`[API_ROOMS_POST] Room creation request by admin: ${adminId}`);
    console.log(`[API_ROOMS_POST] Request body:`, { name, description, visibility, votingSystem, tags, rules, candidateUsernames });


    if (!name || !visibility || !votingSystem) {
      console.log("[API_ROOMS_POST] Missing required fields.");
      return NextResponse.json({ message: 'Missing required fields (name, visibility, votingSystem)' }, { status: 400 });
    }
    
    const members: { userId: Types.ObjectId; role: string }[] = [{ userId: adminId, role: 'admin' }];

    if (candidateUsernames && Array.isArray(candidateUsernames)) {
      console.log(`[API_ROOMS_POST] Processing candidate usernames: ${candidateUsernames.join(', ')}`);
      for (const username of candidateUsernames) {
        if (typeof username === 'string' && username.trim() !== '') {
          const candidateUser = await UserModel.findOne({ username: username.toLowerCase() });
          if (candidateUser) {
            if (!candidateUser._id.equals(adminId)) { 
              if (!members.some(m => m.userId.equals(candidateUser._id))) {
                 members.push({ userId: candidateUser._id, role: 'candidate' });
                 console.log(`[API_ROOMS_POST] Added candidate: ${username} (ID: ${candidateUser._id})`);
              } else {
                console.log(`[API_ROOMS_POST] Candidate ${username} is already in members list (likely admin).`);
              }
            } else {
              console.log(`[API_ROOMS_POST] Candidate ${username} is the admin, skipping.`);
            }
          } else {
            console.log(`[API_ROOMS_POST] Candidate user ${username} not found.`);
          }
        }
      }
    }
    
    console.log(`[API_ROOMS_POST] Final members list for new room:`, members.map(m => ({userId: m.userId.toString(), role: m.role })));
    const newRoom = new RoomModel({
      name,
      description,
      adminId,
      members,
      visibility,
      votingSystem,
      tags: tags || [],
      rules: rules || '',
      posts: [],
      ballots: [],
    });

    console.log("[API_ROOMS_POST] Attempting to save new room...");
    await newRoom.save();
    // Blockchain integration: create room on blockchain
    try {
      await createRoomOnBlockchain(newRoom._id.toString());
      console.log('[API_ROOMS_POST] Room also created on blockchain.');
    } catch (err) {
      console.error('[API_ROOMS_POST] Failed to create room on blockchain:', err);
    }
    
    const populatedRoom = await RoomModel.findById(newRoom._id)
        .populate({ path: 'adminId', select: 'id name username avatarUrl' })
        .populate({ path: 'members.userId', select: 'id name username avatarUrl' })
        .lean();
    
    const responseRoom = {
        ...populatedRoom,
        id: populatedRoom?._id.toString(),
        adminId: populatedRoom?.adminId ? {
            ...(populatedRoom.adminId as any), 
            id: (populatedRoom.adminId as any)?._id.toString(),
        } : null,
        members: (populatedRoom?.members as any[])?.map(mem => ({
            ...mem,
            userId: mem.userId ? {
                ...(mem.userId as any),
                id: (mem.userId as any)?._id.toString(),
            } : null,
        })),
    };
    
    console.log("[API_ROOMS_POST] Room populated for response. Sending success response.");
    return NextResponse.json({ message: 'Room created successfully', room: responseRoom }, { status: 201 });

  } catch (error: any) {
      console.error("Create Room Error:", error); 
     if (error.code === 11000 && error.keyPattern?.name) { 
      console.log("[API_ROOMS_POST] Duplicate room name error.");
      return NextResponse.json({ message: 'A room with this name already exists.' }, { status: 409 });
    }
    console.error("[API_ROOMS_POST_ERROR_STACK] Stack:", error.stack);
    return NextResponse.json({ message: 'Failed to create room', error: error.message || 'Internal server error during room creation.' }, { status: 500 });
  }
}

