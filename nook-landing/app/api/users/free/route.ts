import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  model: z.enum(["apple-silicon", "intel"]),
});

// Free trial — no payment, create immediately.
// Paid users are created in the webhook ONLY after payment.succeeded.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({
        name: data.name,
        email: data.email,
        model: data.model,
        plan: "free",
        isActive: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("users/free:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
