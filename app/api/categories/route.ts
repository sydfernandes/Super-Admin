import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { TreeItem } from '@/types/database';

const categoriesPath = path.join(process.cwd(), 'app/database/categories.json');

async function ensureFile() {
  try {
    await fs.access(categoriesPath);
  } catch {
    await fs.writeFile(categoriesPath, JSON.stringify({ categories: [] }));
  }
}

export async function GET() {
  try {
    await ensureFile();
    const data = await fs.readFile(categoriesPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { categories } = await req.json();
    await ensureFile();
    await fs.writeFile(categoriesPath, JSON.stringify({ categories }, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save categories' }, { status: 500 });
  }
} 