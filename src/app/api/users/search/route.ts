
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) { // Require at least 2 characters for search
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  try {
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    const users = await UserModel.find({
      $and: [
        { _id: { $ne: req.user.userId } }, // Exclude current user
        {
          $or: [
            { name: searchRegex },
            { username: searchRegex },
            // { email: searchRegex } // Optionally search by email
          ],
        }
      ]
    })
    .select('id name username avatarUrl email') // Select only necessary fields
    .limit(10); // Limit results

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: any) {
    console.error('User Search Error:', error);
    return NextResponse.json({ message: 'Failed to search users', error: error.message }, { status: 500 });
  }
}
