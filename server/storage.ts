import { type BrewLog, type InsertBrewLog, brewLogs } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getBrewLogs(): Promise<BrewLog[]>;
  getBrewLog(id: number): Promise<BrewLog | undefined>;
  createBrewLog(log: InsertBrewLog): Promise<BrewLog>;
  deleteBrewLog(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getBrewLogs(): Promise<BrewLog[]> {
    return db.select().from(brewLogs).orderBy(desc(brewLogs.createdAt)).all();
  }

  async getBrewLog(id: number): Promise<BrewLog | undefined> {
    return db.select().from(brewLogs).where(eq(brewLogs.id, id)).get();
  }

  async createBrewLog(log: InsertBrewLog): Promise<BrewLog> {
    return db.insert(brewLogs).values(log).returning().get();
  }

  async deleteBrewLog(id: number): Promise<void> {
    db.delete(brewLogs).where(eq(brewLogs.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
