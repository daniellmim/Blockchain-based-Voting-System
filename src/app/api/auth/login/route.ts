import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  await dbConnect();

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ message: 'Invalid or missing JSON body' }, { status: 400 });
  }

  try {
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Please provide email and password' }, { status: 400 });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password'); // Include password for comparison

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    const userResponse = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
    };

    return NextResponse.json({ message: 'Login successful', token, user: userResponse }, { status: 200 });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
