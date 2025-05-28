import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; // Ensure mongoose is imported

export async function POST(req: NextRequest) {
  console.log('[SIGNUP_API_LOG] Route reached.');

  if (!process.env.JWT_SECRET) {
    console.error('[SIGNUP_API_LOG] FATAL_ERROR: JWT_SECRET is not defined in the server environment.');
    return NextResponse.json(
      { message: 'Internal Server Configuration Error: JWT_SECRET is missing. Please check server environment variables.' },
      { status: 500 }
    );
  }
  console.log('[SIGNUP_API_LOG] JWT_SECRET found.');

  try {
    console.log('[SIGNUP_API_LOG] Attempting to connect to DB...');
    await dbConnect();
    console.log('[SIGNUP_API_LOG] DB connected successfully.');

    const { name, username, email, password } = await req.json();
    console.log('[SIGNUP_API_LOG] Request body parsed:', { name, username, email, password_present: !!password });

    if (!name || !username || !email || !password) {
      console.log('[SIGNUP_API_LOG] Missing required fields.');
      return NextResponse.json({ message: 'Please provide all required fields' }, { status: 400 });
    }

    if (password.length < 6) {
        console.log('[SIGNUP_API_LOG] Password too short.');
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }
    if (username.length < 3) {
        console.log('[SIGNUP_API_LOG] Username too short.');
        return NextResponse.json({ message: 'Username must be at least 3 characters long' }, { status: 400 });
    }

    console.log('[SIGNUP_API_LOG] Checking for existing user by email:', email.toLowerCase());
    let existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('[SIGNUP_API_LOG] User already exists with this email.');
      return NextResponse.json({ message: 'User already exists with this email' }, { status: 409 });
    }

    console.log('[SIGNUP_API_LOG] Checking for existing user by username:', username.toLowerCase());
    existingUser = await UserModel.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      console.log('[SIGNUP_API_LOG] Username is already taken.');
      return NextResponse.json({ message: 'Username is already taken' }, { status: 409 });
    }

    console.log('[SIGNUP_API_LOG] Creating new user instance...');
    const newUser = new UserModel({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // Hashing is handled by pre-save hook in User model
      avatarUrl: `/images/avatars/default-new-user.png`
    });

    console.log('[SIGNUP_API_LOG] Attempting to save new user...');
    await newUser.save();
    console.log('[SIGNUP_API_LOG] New user saved successfully. ID:', newUser.id);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, name: newUser.name, username: newUser.username, avatarUrl: newUser.avatarUrl },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log('[SIGNUP_API_LOG] JWT token generated.');

    const userResponse = {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
    };

    console.log('[SIGNUP_API_LOG] Sending success response.');
    return NextResponse.json({ message: 'User created successfully', token, user: userResponse }, { status: 201 });

  } catch (error: any) {
    console.error('[SIGNUP_API_LOG] Catch block error:', error.message, error.stack);
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      console.error('[SIGNUP_API_LOG] Mongoose ValidationError:', messages);
      return NextResponse.json({ message: 'Validation Error', errors: messages }, { status: 400 });
    }
    if (error.code === 11000) {
        if (error.keyPattern?.email) {
            console.error('[SIGNUP_API_LOG] Duplicate email error (MongoDB E11000).');
            return NextResponse.json({ message: 'User already exists with this email' }, { status: 409 });
        }
        if (error.keyPattern?.username) {
            console.error('[SIGNUP_API_LOG] Duplicate username error (MongoDB E11000).');
            return NextResponse.json({ message: 'Username is already taken' }, { status: 409 });
        }
    }
    console.error('[SIGNUP_API_LOG] Unhandled Internal Server Error. Full error object:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message || 'An unexpected error occurred during signup.' }, { status: 500 });
  }
}
