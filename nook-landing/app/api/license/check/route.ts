import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const email = searchParams.get("email");

    if (!sessionId && !email) {
      return NextResponse.json(
        { error: "Session ID or email required" },
        { status: 400 },
      );
    }

    let user = null;

    if (email) {
      // Check by email
      const usersByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (usersByEmail.length > 0) {
        user = usersByEmail[0];
      }
    } else if (sessionId) {
      // For now, we'll check recent users (in production, you'd store session data)
      // This is a simplified approach for development
      const recentUsers = await db
        .select()
        .from(users)
        .where(eq(users.plan, "paid"))
        .orderBy(users.createdAt)
        .limit(10);

      // Find the most recent user that matches (simplified logic)
      if (recentUsers.length > 0) {
        user = recentUsers[recentUsers.length - 1];
      }
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "License not found yet",
      });
    }

    // Since license data is stored in the users table, return user license info directly
    return NextResponse.json({
      success: true,
      license: {
        userId: user.id,
        licenseKey: user.licenseKey,
        email: user.email,
        plan: user.plan,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error checking license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
