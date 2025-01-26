"use server";

import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  try {
    // Read history from JSON file
    const historyPath = path.join(process.cwd(), 'app/database/product-structure-history.json');
    const historyData = await fs.readFile(historyPath, 'utf8');
    const history = JSON.parse(historyData);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error reading history:', error);
    // If file doesn't exist or is invalid JSON, return empty history
    return NextResponse.json({ history: [] });
  }
}

export async function POST(request: Request) {
  try {
    const historyPath = path.join(process.cwd(), 'app/database/product-structure-history.json');
    
    // Read existing history
    let history;
    try {
      const historyData = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(historyData);
    } catch {
      history = { history: [] };
    }

    // Get new action from request
    const action = await request.json();

    // Add new action to history
    if (Array.isArray(history.history)) {
      history.history.unshift(action);
    } else {
      history.history = [action];
    }

    // Write updated history back to file
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error updating history:', error);
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
} 