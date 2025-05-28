
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

export async function POST(req: AuthenticatedRequest) {
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ message: 'Current password and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
        return NextResponse.json({ message: 'New password must be at least 6 characters long' }, { status: 400 });
    }


    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json({ message: 'Incorrect current password' }, { status: 401 });
    }

    user.password = newPassword; // Pre-save hook in User model will hash it
    await user.save();

    return NextResponse.json({ message: 'Password changed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
