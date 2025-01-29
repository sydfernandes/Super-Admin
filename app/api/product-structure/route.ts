import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

interface FieldItem {
  id: string;
  name: string;
  type: string;
  required: boolean;
  parentId: string | null;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app/database/product-structure-flat.json');
    const fileData = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileData);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading fields:', error);
    return NextResponse.json({ fields: [] });
  }
}

export async function POST(request: Request) {
  try {
    const filePath = path.join(process.cwd(), 'app/database/product-structure-flat.json');
    const { fields } = await request.json();
    
    await fs.writeFile(filePath, JSON.stringify({ fields }, null, 2));
    return NextResponse.json({ fields });
  } catch (error) {
    console.error('Error saving fields:', error);
    return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 });
  }
} 