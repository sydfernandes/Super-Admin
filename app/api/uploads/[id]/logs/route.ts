import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Read uploads.json to get the file info
    const uploadsPath = path.join(process.cwd(), 'database', 'uploads.json')
    const uploadsContent = await fs.readFile(uploadsPath, 'utf-8')
    const uploadsData = JSON.parse(uploadsContent)
    
    // Find the upload record
    const upload = uploadsData.uploads.find((u: any) => u.id === id)
    if (!upload) {
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      )
    }
    
    // Get the log file path
    const logFileName = `process_${id}.log`
    const logPath = path.join(process.cwd(), 'logs', logFileName)
    
    // Check if log file exists
    try {
      const logContent = await fs.readFile(logPath, 'utf-8')
      return new NextResponse(logContent)
    } catch (error) {
      return new NextResponse('')
    }
    
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
} 