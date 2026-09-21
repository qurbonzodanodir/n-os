import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// A bounded personal workspace document. Revision protects concurrent devices.
export const workspaces = sqliteTable('workspaces', {
  ownerId: text('owner_id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
