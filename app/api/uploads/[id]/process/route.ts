import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { promises as fs } from 'fs'

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('\n=== Starting Process ===')
    console.log('Processing file with ID:', id)
    
    // Read uploads.json to get the file path
    const uploadsPath = path.join(process.cwd(), 'database', 'uploads.json')
    console.log('Reading uploads from:', uploadsPath)
    
    const uploadsContent = await fs.readFile(uploadsPath, 'utf-8')
    const uploadsData: UploadsData = JSON.parse(uploadsContent)
    
    // Find the upload record
    const upload = uploadsData.uploads.find(u => u.id === id)
    if (!upload) {
      console.error('Upload record not found for ID:', id)
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      )
    }
    
    console.log('Found upload record:', upload)
    
    // Get the absolute paths
    const scriptPath = path.join(process.cwd(), 'scripts', 'process_queue.py')
    
    // Fix the file path by removing the 'app' prefix since it's already in process.cwd()
    const relativePath = upload.queuePath.replace(/^app\//, '')
    const filePath = path.join(process.cwd(), relativePath)
    
    console.log('\nDebug Info:')
    console.log('Current working directory:', process.cwd())
    console.log('Script path:', scriptPath)
    console.log('Original queue path:', upload.queuePath)
    console.log('Adjusted relative path:', relativePath)
    console.log('Final file path:', filePath)
    
    // Verify paths exist
    const scriptExists = await fs.access(scriptPath).then(() => true).catch(() => false)
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
    
    console.log('\nPath Verification:')
    console.log('Script exists:', scriptExists)
    console.log('File exists:', fileExists)
    
    if (!scriptExists) {
      console.error('Python script not found at:', scriptPath)
      return NextResponse.json(
        { error: 'Processing script not found' },
        { status: 500 }
      )
    }
    
    if (!fileExists) {
      console.error('File not found at:', filePath)
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs')
    await fs.mkdir(logsDir, { recursive: true })
    
    // Set up log file path
    const logPath = path.join(logsDir, `process_${id}.log`)
    console.log('Log file will be written to:', logPath)

    // Update status in uploads.json
    upload.status = 'processing'
    await fs.writeFile(uploadsPath, JSON.stringify(uploadsData, null, 2))
    console.log('Updated upload status to processing')

    console.log('\nStarting Python Process:')
    console.log('Command:', process.platform === 'win32' ? 'python' : 'python3', [scriptPath, filePath])
    
    // Create a write stream for the log file
    const logStream = await fs.open(logPath, 'w')

    // Get Python executable based on platform
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    
    // Run the Python script with output redirection
    const pythonProcess = spawn(pythonCmd, [scriptPath, filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd() // Explicitly set working directory
    })

    // Pipe output to both console and log file
    pythonProcess.stdout.on('data', async (data) => {
      const output = data.toString()
      console.log(output)
      await logStream.write(output)
    })

    pythonProcess.stderr.on('data', async (data) => {
      const output = data.toString()
      console.error(output)
      await logStream.write(output)
    })

    // Handle process completion
    pythonProcess.on('close', async (code) => {
      console.log(`Python process exited with code ${code}`)
      await logStream.close()
      
      // Update status based on exit code
      upload.status = code === 0 ? 'completed' : 'error'
      await fs.writeFile(uploadsPath, JSON.stringify(uploadsData, null, 2))
    })

    // Handle process error
    pythonProcess.on('error', async (error) => {
      console.error('Failed to start Python process:', error)
      await logStream.write(`Error starting process: ${error.message}\n`)
      await logStream.close()
      
      // Update status to error
      upload.status = 'error'
      await fs.writeFile(uploadsPath, JSON.stringify(uploadsData, null, 2))
    })

    return NextResponse.json({
      success: true,
      message: 'Processing started',
      scriptPath,
      filePath,
      logPath
    })
    
  } catch (error: any) {
    console.error('Error in process route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
} 