import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    return NextResponse.json({ exists: existing.length > 0 });
  } catch (err) {
    console.error("check-email:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
