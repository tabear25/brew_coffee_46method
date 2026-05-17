import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const brewLogs = sqliteTable("brew_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Bean info
  beanName: text("bean_name").notNull(),
  beanOrigin: text("bean_origin"),
  roastLevel: text("roast_level").notNull(), // light, medium-light, medium, medium-dark, dark
  // Brew params
  coffeeGrams: real("coffee_grams").notNull(),
  waterGrams: real("water_grams").notNull(),
  brewTimeSeconds: integer("brew_time_seconds").notNull(),
  pourCount: integer("pour_count").notNull(),
  // Flavor profile from 4:6
  flavorBalance: text("flavor_balance").notNull(), // sweet, balanced, bright
  strengthLevel: text("strength_level").notNull(), // light, medium, strong
  // Optional notes
  rating: integer("rating"), // 1-5
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertBrewLogSchema = createInsertSchema(brewLogs).omit({
  id: true,
});

export type InsertBrewLog = z.infer<typeof insertBrewLogSchema>;
export type BrewLog = typeof brewLogs.$inferSelect;
