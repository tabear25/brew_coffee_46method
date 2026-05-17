import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBrewLogSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all brew logs
  app.get("/api/brew-logs", async (_req, res) => {
    const logs = await storage.getBrewLogs();
    res.json(logs);
  });

  // Get single brew log
  app.get("/api/brew-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const log = await storage.getBrewLog(id);
    if (!log) {
      return res.status(404).json({ message: "Brew log not found" });
    }
    res.json(log);
  });

  // Create brew log
  app.post("/api/brew-logs", async (req, res) => {
    const parsed = insertBrewLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
    }
    const log = await storage.createBrewLog(parsed.data);
    res.status(201).json(log);
  });

  // Delete brew log
  app.delete("/api/brew-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteBrewLog(id);
    res.status(204).send();
  });

  return httpServer;
}
