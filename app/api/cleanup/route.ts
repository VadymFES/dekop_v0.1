// app/api/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  try {
    // Delete expired carts
    const result = await sql`DELETE FROM carts WHERE expires_at < NOW()`;
    console.log("Expired carts cleaned up, rows affected:", result.rowCount);
    return NextResponse.json({ message: "Cleanup completed" });
  } catch (error) {
    console.error("Error cleaning up expired carts:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
