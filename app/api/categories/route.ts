import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CATEGORIES_FILE = path.join(process.cwd(), 'app/database/categories.json');
const HISTORY_FILE = path.join(process.cwd(), 'app/database/categories-history.json');

// Ensure files exist
async function ensureFiles() {
  try {
    await fs.access(CATEGORIES_FILE);
  } catch {
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify({ categories: [] }));
  }

  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, JSON.stringify({ history: [] }));
  }
}

// GET /api/categories
export async function GET() {
  try {
    await ensureFiles();
    const fileContents = await fs.readFile(CATEGORIES_FILE, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading categories:', error);
    return NextResponse.json(
      { error: 'Failed to read categories' },
      { status: 500 }
    );
  }
}

// PUT /api/categories
export async function PUT(request: Request) {
  try {
    const { categories } = await request.json();
    
    // Validate categories structure
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      );
    }

    // Validate each category has required fields
    for (const category of categories) {
      if (!category.id || !category.name) {
        return NextResponse.json(
          { error: 'Each category must have id and name' },
          { status: 400 }
        );
      }
    }

    // Ensure parentId is null if not provided
    const processedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId || null,
      metadata: category.metadata || {}
    }));

    await ensureFiles();
    await fs.writeFile(
      CATEGORIES_FILE,
      JSON.stringify({ categories: processedCategories }, null, 2)
    );

    return NextResponse.json({ success: true, categories: processedCategories });
  } catch (error) {
    console.error('Error saving categories:', error);
    return NextResponse.json(
      { error: 'Failed to save categories' },
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

    await ensureFiles();
    
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

// GET /api/categories/history
export async function getHistory() {
  try {
    await ensureFiles();
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