
import { NextResponse } from 'next/server';

export async function GET() {
  const isConfigured = process.env.SINGLE_TENANT === "true" && !!process.env.ADMIN_PASSWORD;
  
  return NextResponse.json({ 
    configured: isConfigured,
    missing: {
      singleTenant: process.env.SINGLE_TENANT !== "true",
      adminPassword: !process.env.ADMIN_PASSWORD
    }
  });
}
