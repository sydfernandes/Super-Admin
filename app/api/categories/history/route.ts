import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const historyPath = path.join(process.cwd(), "app/database/categories-history.json");

// Ensure history file exists
async function ensureHistoryFile() {
  try {
    await fs.access(historyPath);
  } catch {
    await fs.writeFile(historyPath, JSON.stringify({ history: [] }));
  }
}

export async function GET() {
  await ensureHistoryFile();
  const historyData = await fs.readFile(historyPath, "utf-8");
  return NextResponse.json(JSON.parse(historyData));
}

export async function POST(req: Request) {
  await ensureHistoryFile();
  const { action } = await req.json();
  
  // Read existing history
  const historyData = await fs.readFile(historyPath, "utf-8");
  const { history } = JSON.parse(historyData);
  
  // Add new action to history
  const updatedHistory = [action, ...history].slice(0, 1000); // Keep last 1000 actions
  
  // Save updated history
  await fs.writeFile(historyPath, JSON.stringify({ history: updatedHistory }, null, 2));
  
  return NextResponse.json({ success: true });
} 