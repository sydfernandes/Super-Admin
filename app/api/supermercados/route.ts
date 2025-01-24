import { writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const filePath = path.join(process.cwd(), 'app', 'database', 'supermercados.json')
    
    await writeFile(filePath, JSON.stringify({ supermercados: data }, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving supermercados:', error)
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 })
  }
} 