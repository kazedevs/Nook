import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key } = body;

    console.log("license validation request:", { license_key });

    if (!license_key) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 },
      );
    }

    // Find user with the given license key
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.licenseKey, license_key))
      .limit(1);

    console.log(
      "found user:",
      user
        ? { email: user.email, plan: user.plan, isActive: user.isActive }
        : null,
    );

    if (!user) {
      console.log("license key not found in database");
      return NextResponse.json({ is_valid: false });
    }

    // Check if user is active and has a paid plan
    const isValid = user.isActive && user.plan === "paid" && user.licenseKey;

    console.log("license validation result:", {
      isValid,
      plan: user.plan,
      isActive: user.isActive,
    });

    if (!isValid) {
      return NextResponse.json({ is_valid: false });
    }

    return NextResponse.json({
      is_valid: true,
      user: {
        name: user.name,
        email: user.email,
        model: user.model,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("License validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
