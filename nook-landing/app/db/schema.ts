import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// Single table. Dodo owns the license key — we just store a reference to it.
// No separate licenses table needed: one user = one lifetime purchase = one key.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Collected from the pricing form
  name:  text('name').notNull(),
  email: text('email').notNull().unique(),
  model: text('model').notNull(), // 'apple-silicon' | 'intel'

  // Filled in by the webhook after payment.succeeded
  // licenseKey comes from Dodo — we do NOT generate it ourselves.
  plan:       text('plan').notNull().default('free'),   // 'free' | 'paid'
  licenseKey: text('license_key').unique(),              // from Dodo webhook data.license_key
  dodoPurchaseId: text('dodo_purchase_id').unique(),     // Dodo's payment ID for reference

  // Soft-disable without deleting (e.g. chargeback)
  isActive: boolean('is_active').notNull().default(true),

  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert