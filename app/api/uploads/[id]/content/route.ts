import { readFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

interface Upload {
  id: string
  fileName: string
  queuePath: string
  uploadedAt: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  fileSize: number
}

interface UploadsData {
  uploads: Upload[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Read uploads.json to find the file path
    const uploadsPath = path.join(process.cwd(), 'database', 'uploads.json')
    const uploadsContent = await readFile(uploadsPath, 'utf-8')
    const uploadsData: UploadsData = JSON.parse(uploadsContent)
    
    // Find the upload record
    const upload = uploadsData.uploads.find(u => u.id === params.id)
    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    // Read the actual file content
    const filePath = path.join(process.cwd(), upload.queuePath)
    const fileContent = await readFile(filePath, 'utf-8')
    const content = JSON.parse(fileContent)

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error reading file content:', error)
    return NextResponse.json(
      { error: 'Failed to read file content' },
      { status: 500 }
    )
  }
} 