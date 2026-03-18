import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const webhookId = req.headers.get("webhook-id") ?? "";
    const timestamp = req.headers.get("webhook-timestamp") ?? "";
    const sigHeader = req.headers.get("webhook-signature") ?? "";

    const wh = new Webhook(process.env.DODO_WEBHOOK_SECRET!);
    wh.verify(payload, {
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": sigHeader,
    });

    const { type, data } = JSON.parse(payload);

    // license_key.created fires first — save key, create placeholder row if needed
    if (type === "license_key.created") {
      const licenseKey = data.key;
      const purchaseId = data.payment_id;

      if (!licenseKey || !purchaseId)
        return NextResponse.json({ received: true });

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.dodoPurchaseId, purchaseId))
        .limit(1);

      if (existing.length === 0) {
        // payment.succeeded hasn't fired yet — create placeholder row
        // payment.succeeded will fill in name/email/model
        await db.insert(users).values({
          name: "pending",
          email: `pending_${purchaseId}@nook.app`,
          model: "apple-silicon",
          plan: "paid",
          licenseKey,
          dodoPurchaseId: purchaseId,
          isActive: true,
        });
        console.log("placeholder row created for:", purchaseId);
      } else {
        await db
          .update(users)
          .set({ licenseKey, updatedAt: new Date() })
          .where(eq(users.dodoPurchaseId, purchaseId));
      }
      console.log("license saved:", purchaseId, "→", licenseKey);
    }

    // payment.succeeded fires after — update row with real customer data
    if (type === "payment.succeeded") {
      const email = data.customer?.email;
      const purchaseId = data.payment_id;
      const name = data.customer?.name ?? email?.split("@")[0] ?? "user";
      const model = data.metadata?.model ?? "apple-silicon";

      if (!email) return NextResponse.json({ received: true });

      // Check if placeholder row exists (created by license_key.created)
      const byPurchase = await db
        .select()
        .from(users)
        .where(eq(users.dodoPurchaseId, purchaseId))
        .limit(1);

      if (byPurchase.length > 0) {
        // Update placeholder with real customer data
        await db
          .update(users)
          .set({ name, email, model, updatedAt: new Date() })
          .where(eq(users.dodoPurchaseId, purchaseId));
        console.log("updated placeholder user:", email);
      } else {
        // Check if user already exists by email (e.g. free trial upgrading)
        const byEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (byEmail.length === 0) {
          // No placeholder and no existing user - create new one
          await db.insert(users).values({
            name,
            email,
            model,
            plan: "paid",
            dodoPurchaseId: purchaseId,
            isActive: true,
          });
          console.log("created new user:", email);
        } else {
          // User exists - update to paid plan
          await db
            .update(users)
            .set({
              plan: "paid",
              dodoPurchaseId: purchaseId,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(users.email, email));
          console.log("updated existing user to paid:", email);
        }
      }
      console.log("payment recorded:", email);
    }

    if (type === "license_key.disabled" || type === "license.disabled") {
      const licenseKey = data.key ?? data.license_key;
      if (licenseKey) {
        await db
          .update(users)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(users.licenseKey, licenseKey));
        console.log("revoked:", licenseKey);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("webhook error:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
}
