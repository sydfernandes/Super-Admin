import { readFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  try {
    const uploadsPath = path.join(process.cwd(), 'database', 'uploads.json')
    const uploadsContent = await readFile(uploadsPath, 'utf-8')
    const uploadsData = JSON.parse(uploadsContent)
    
    return NextResponse.json(uploadsData)
  } catch (error) {
    console.error('Error reading uploads:', error)
    return NextResponse.json(
      { uploads: [] },
      { status: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 200 : 500 }
    )
  }
} 