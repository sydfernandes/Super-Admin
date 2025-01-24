import { writeFile, readFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
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

async function updateUploadsJson(newUpload: Upload) {
  const uploadsPath = path.join(process.cwd(), 'database', 'uploads.json')
  
  try {
    // Read existing uploads
    const uploadsContent = await readFile(uploadsPath, 'utf-8')
    const uploadsData: UploadsData = JSON.parse(uploadsContent)
    
    // Add new upload
    uploadsData.uploads.unshift(newUpload)
    
    // Save updated uploads
    await writeFile(uploadsPath, JSON.stringify(uploadsData, null, 2))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If file doesn't exist, create it with initial data
      const initialData: UploadsData = {
        uploads: [newUpload]
      }
      await writeFile(uploadsPath, JSON.stringify(initialData, null, 2))
    } else {
      throw error
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { content, fileName } = data

    // Create queue path with date structure
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = now.getTime()

    // Create relative and absolute paths
    const relativeQueuePath = path.join('app', 'database', 'processed', 'queue', year, month, day)
    const absoluteQueuePath = path.join(process.cwd(), relativeQueuePath)
    const newFileName = `${path.parse(fileName).name}_${timestamp}.json`
    const relativeFilePath = path.join(relativeQueuePath, newFileName)
    const absoluteFilePath = path.join(absoluteQueuePath, newFileName)

    // Create directories if they don't exist
    await mkdir(absoluteQueuePath, { recursive: true })

    // Save file to queue
    await writeFile(absoluteFilePath, JSON.stringify(content, null, 2))

    // Create upload record
    const upload: Upload = {
      id: `upload_${timestamp}`,
      fileName,
      queuePath: relativeFilePath,
      uploadedAt: now.toISOString(),
      status: 'queued',
      fileSize: Buffer.from(JSON.stringify(content)).length
    }

    // Update uploads.json
    await updateUploadsJson(upload)

    return NextResponse.json({ 
      success: true, 
      path: relativeFilePath,
      upload 
    })
  } catch (error) {
    console.error('Error saving file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save file' },
      { status: 500 }
    )
  }
} 