import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "secure-personal-vault",
      databaseProvider: process.env.DATABASE_PROVIDER || "postgresql",
      databaseAuthorization:
        process.env.DATABASE_AUTHORIZATION_MODE || "supabase-rls",
      storageProvider: process.env.STORAGE_PROVIDER || "s3-compatible",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
