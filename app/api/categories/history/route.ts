import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'app/database/categories-history.json');

// Ensure history file exists
async function ensureHistoryFile() {
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, JSON.stringify({ history: [] }));
  }
}

// GET /api/categories/history
export async function GET() {
  try {
    await ensureHistoryFile();
    const fileContents = await fs.readFile(HISTORY_FILE, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading history:', error);
    return NextResponse.json(
      { error: 'Failed to read history' },
      { status: 500 }
    );
  }
}

// POST /api/categories/history
export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    // Validate action structure
    if (!action || !action.id || !action.timestamp || !action.action) {
      return NextResponse.json(
        { error: 'Invalid action structure' },
        { status: 400 }
      );
    }

    await ensureHistoryFile();
    
    // Read current history
    const fileContents = await fs.readFile(HISTORY_FILE, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Add new action to history
    const history = [action, ...(data.history || [])];
    
    // Save updated history
    await fs.writeFile(
      HISTORY_FILE,
      JSON.stringify({ history }, null, 2)
    );

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error saving history:', error);
    return NextResponse.json(
      { error: 'Failed to save history' },
      { status: 500 }
    );
  }
} 