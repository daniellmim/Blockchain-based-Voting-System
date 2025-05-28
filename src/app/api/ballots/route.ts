
// This API route is not used when using mock-data.ts.
// Kept for reference if API integration is restored. Empty for now.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API inactive, using mock data for ballots.' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: 'API inactive, using mock data for ballots.' }, { status: 404 });
}
