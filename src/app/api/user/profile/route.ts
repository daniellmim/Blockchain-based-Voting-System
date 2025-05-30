import dbConnect from '@/lib/mongodb';
import UserModel, { IUserDocument } from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { sanitizeInput } from '@/lib/utils';

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

export async function PUT(req: AuthenticatedRequest) {
  await dbConnect();

  const isAuthenticated = await authenticate(req);
  if (!isAuthenticated || !req.user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const { name, username, avatarUrl, currentPassword } = await req.json();
    const userId = req.user.userId;

    // Require current password for any profile change
    if (!currentPassword) {
      return NextResponse.json({ message: 'Current password is required to update profile.' }, { status: 400 });
    }
    const userToUpdate = await UserModel.findById(userId).select('+password');
    if (!userToUpdate) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const isMatch = await userToUpdate.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 });
    }

    // Sanitize inputs
    if (username && username.toLowerCase() !== userToUpdate.username.toLowerCase()) {
      const sanitizedUsername = sanitizeInput(username.toLowerCase());
      const existingUserByUsername = await UserModel.findOne({ username: sanitizedUsername });
      if (existingUserByUsername && String(existingUserByUsername._id) !== String(userToUpdate._id)) {
        return NextResponse.json({ message: 'Username is already taken' }, { status: 409 });
      }
      userToUpdate.username = sanitizedUsername;
    }
    if (name) userToUpdate.name = sanitizeInput(name);
    if (avatarUrl) userToUpdate.avatarUrl = sanitizeInput(avatarUrl);
    // Email is not updatable in this endpoint for simplicity

    await userToUpdate.save();

    // Generate a new token if identity-related fields changed
    const updatedTokenPayload = {
      userId: userToUpdate.id,
      email: userToUpdate.email,
      name: userToUpdate.name,
      username: userToUpdate.username,
      avatarUrl: userToUpdate.avatarUrl,
    };
    const newToken = jwt.sign(updatedTokenPayload, process.env.JWT_SECRET!, { expiresIn: '1d' });

    const userResponse = {
        id: userToUpdate.id,
        name: userToUpdate.name,
        username: userToUpdate.username,
        email: userToUpdate.email,
        avatarUrl: userToUpdate.avatarUrl,
    };

    return NextResponse.json({ message: 'Profile updated successfully', user: userResponse, token: newToken }, { status: 200 });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    if (error.code === 11000) { // Mongoose duplicate key error for username
        return NextResponse.json({ message: 'Username is already taken.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
