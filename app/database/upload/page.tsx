"use client"

import { useCallback, useState, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, MoreHorizontal, Upload, FileJson, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import path from "path"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  fileName: string
  size: number
  type: string
  uploadedAt: Date
  content?: any
  status: 'processing' | 'ready' | 'error' | 'queued' | 'completed'
  error?: string
  queuePath?: string
  uploadId?: string
}

interface UploadRecord {
  id: string
  fileName: string
  queuePath: string
  uploadedAt: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  fileSize: number
}

interface PreviewContent {
  fileName: string
  content?: {
    products: Array<{
      [key: string]: any
    }>
  }
}

function sanitizeFileName(fileName: string): string {
  // Remove file extension
  const { name, ext } = path.parse(fileName)
  
  // Replace special characters and spaces with underscores
  const sanitized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single one
    .toLowerCase()
  
  return sanitized + ext
}

async function saveFileToQueue(content: any, originalName: string) {
  try {
    const sanitizedName = sanitizeFileName(originalName)
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        fileName: sanitizedName,
      }),
    })

    if (!response.ok) throw new Error('Failed to save file')
    
    const data = await response.json()
    return {
      path: data.path,
      uploadId: data.upload.id,
      upload: data.upload
    }
  } catch (error) {
    console.error('Error saving file:', error)
    throw error
  }
}

export default function DatabaseUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [historicalUploads, setHistoricalUploads] = useState<UploadRecord[]>([])
  const [selectedFile, setSelectedFile] = useState<PreviewContent | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [logFile, setLogFile] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>('')

  useEffect(() => {
    async function fetchUploads() {
      try {
        const response = await fetch('/api/uploads')
        if (!response.ok) throw new Error('Failed to fetch uploads')
        const data = await response.json()
        setHistoricalUploads(data.uploads)
      } catch (error) {
        console.error('Error fetching uploads:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUploads()
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const sanitizedName = sanitizeFileName(file.name)
      const newFile: UploadedFile = {
        id: `file_${Date.now()}`,
        fileName: sanitizedName,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'processing'
      }
      setUploadedFiles(prev => [...prev, newFile])

      try {
        const content = await file.text()
        const parsedContent = JSON.parse(content) // Validate JSON
        const { path, uploadId, upload } = await saveFileToQueue(parsedContent, file.name)
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { 
                ...f, 
                content: parsedContent, 
                status: upload.status,
                queuePath: path,
                uploadId
              } 
            : f
        ))
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: 'error', error: 'Invalid JSON format' } 
            : f
        ))
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/json': ['.json']
    }
  })

  const handlePreview = async (file: UploadedFile | UploadRecord) => {
    setPreviewLoading(true)
    setPreviewError(null)
    setSelectedFile({ fileName: file.fileName, content: { products: [] } })
    setPreviewOpen(true)
    
    try {
      let content;
      
      if ('content' in file && file.content) {
        // Handle UploadedFile type (in-memory)
        content = file.content
      } else {
        // Handle UploadRecord type or UploadedFile without content - need to fetch from filesystem
        const response = await fetch(`/api/uploads/${file.id}/content`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch file content')
        }
        
        const data = await response.json()
        if (!data.content || !data.content.products) {
          throw new Error('Invalid file format - no products found')
        }
        
        content = data.content
      }
      
      setSelectedFile({
        fileName: file.fileName,
        content
      })
    } catch (error) {
      console.error('Error fetching file content:', error)
      setPreviewError(error instanceof Error ? error.message : 'Error loading file content')
    } finally {
      setPreviewLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getProductColumns = (products: Array<{ [key: string]: any }>) => {
    if (!products || products.length === 0) return []
    
    // Get all unique keys from all products
    const allKeys = new Set<string>()
    products.forEach(product => {
      Object.keys(product).forEach(key => allKeys.add(key))
    })
    
    // Convert to array and sort
    return Array.from(allKeys).sort()
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') return value.toLocaleString()
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    return value.toString()
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId)
      } else {
        newSelection.add(fileId)
      }
      return newSelection
    })
  }

  const toggleAllFiles = () => {
    if (selectedFiles.size > 0) {
      setSelectedFiles(new Set())
    } else {
      const allIds = new Set([
        ...uploadedFiles.map(f => f.id),
        ...historicalUploads.map(f => f.id)
      ])
      setSelectedFiles(allIds)
    }
  }

  const fetchLogs = useCallback(async (logFilePath: string) => {
    try {
      const response = await fetch(`/api/logs/${encodeURIComponent(logFilePath)}`)
      if (!response.ok) throw new Error('Failed to fetch logs')
      const data = await response.json()
      setLogs(data.content)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }, [])

  useEffect(() => {
    if (!logFile) return

    const interval = setInterval(() => {
      fetchLogs(logFile)
    }, 1000)

    return () => clearInterval(interval)
  }, [logFile, fetchLogs])

  const processSelectedFiles = async () => {
    try {
      setIsProcessing(true)
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles)
        }),
      })

      if (!response.ok) throw new Error('Failed to process files')
      
      const data = await response.json()
      setLogFile(data.logFile)
      
      // Clear selection
      setSelectedFiles(new Set())
      
      // Refresh uploads list
      const uploadsResponse = await fetch('/api/uploads')
      if (!uploadsResponse.ok) throw new Error('Failed to fetch uploads')
      const uploadsData = await uploadsResponse.json()
      setHistoricalUploads(uploadsData.uploads)
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessFile = async (file: UploadedFile | UploadRecord) => {
    try {
      setIsProcessing(true)
      setLogs('') // Clear previous logs
      
      // Update file status to processing
      if ('uploadId' in file) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing' } : f
        ))
      } else {
        setHistoricalUploads(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing' } : f
        ))
      }
      
      // Call the process API
      const response = await fetch(`/api/uploads/${file.id}/process`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Processing failed')
      }
      
      const data = await response.json()
      
      // Start polling for logs
      const pollLogs = async () => {
        try {
          const logsResponse = await fetch(`/api/uploads/${file.id}/logs`)
          if (logsResponse.ok) {
            const logsData = await logsResponse.text()
            setLogs(logsData)
            
            // Check if processing is complete
            if (logsData.includes('Processing completed successfully')) {
              if ('uploadId' in file) {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === file.id ? { ...f, status: 'completed' } : f
                ))
              } else {
                setHistoricalUploads(prev => prev.map(f => 
                  f.id === file.id ? { ...f, status: 'completed' } : f
                ))
              }
              return true
            } else if (logsData.includes('Processing failed')) {
              if ('uploadId' in file) {
                setUploadedFiles(prev => prev.map(f => 
                  f.id === file.id ? { ...f, status: 'error', error: 'Processing failed' } : f
                ))
              } else {
                setHistoricalUploads(prev => prev.map(f => 
                  f.id === file.id ? { ...f, status: 'error' } : f
                ))
              }
              return true
            }
          }
          return false
        } catch (error) {
          console.error('Error fetching logs:', error)
          return false
        }
      }
      
      // Poll for logs every second until complete
      const pollInterval = setInterval(async () => {
        const isComplete = await pollLogs()
        if (isComplete) {
          clearInterval(pollInterval)
          setIsProcessing(false)
        }
      }, 1000)
      
      // Show success message
      toast.success('Processing started')
      
    } catch (error) {
      console.error('Error processing file:', error)
      
      // Update file status to error
      if ('uploadId' in file) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error', error: 'Processing failed' } : f
        ))
      } else {
        setHistoricalUploads(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error' } : f
        ))
      }
      
      // Show error message
      toast.error('Failed to process file')
      
    } finally {
      setIsProcessing(false)
    }
  }

  // Add process button to dropdown menu
  const renderActionDropdown = (file: UploadedFile | UploadRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlePreview(file)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleProcessFile(file)}
          disabled={isProcessing || file.status === 'processing' || file.status === 'completed'}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="mr-2 h-4 w-4" />
          )}
          Process
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/database">Base de Datos</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Adicionar Archivos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 gap-4 p-4 pt-0">
        {/* Files Table */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Archivos Subidos</CardTitle>
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size} archivo{selectedFiles.size !== 1 ? 's' : ''} seleccionado{selectedFiles.size !== 1 ? 's' : ''}
                </span>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={processSelectedFiles}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    'Procesar'
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedFiles.size > 0 && selectedFiles.size === (uploadedFiles.length + historicalUploads.length)}
                      onChange={toggleAllFiles}
                    />
                  </TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Recent Uploads (in-memory) */}
                {uploadedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-blue-500" />
                        {file.fileName}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      {file.uploadedAt.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {file.status === 'processing' ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Procesando...</span>
                        </div>
                      ) : file.status === 'error' ? (
                        <span className="text-xs text-destructive">
                          Error: {file.error}
                        </span>
                      ) : file.status === 'queued' ? (
                        <span className="text-xs text-yellow-600">
                          En Cola
                        </span>
                      ) : file.status === 'completed' ? (
                        <span className="text-xs text-green-600">
                          Completado
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">
                          Listo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {renderActionDropdown(file)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Historical Uploads */}
                {historicalUploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedFiles.has(upload.id)}
                        onChange={() => toggleFileSelection(upload.id)}
                        disabled={upload.status === 'processing' || upload.status === 'completed'}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-blue-500" />
                        {upload.fileName}
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(upload.fileSize)}</TableCell>
                    <TableCell>
                      {new Date(upload.uploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {upload.status === 'processing' ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Procesando...</span>
                        </div>
                      ) : upload.status === 'error' ? (
                        <span className="text-xs text-destructive">
                          Error al procesar
                        </span>
                      ) : upload.status === 'completed' ? (
                        <span className="text-xs text-green-600">
                          Completado
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-600">
                          En Cola
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {renderActionDropdown(upload)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Empty State */}
                {!isLoading && uploadedFiles.length === 0 && historicalUploads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No hay archivos subidos
                    </TableCell>
                  </TableRow>
                )}

                {/* Loading State */}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Cargando archivos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subir Archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
                isDragActive && "border-primary bg-primary/5",
                "hover:border-primary hover:bg-primary/5"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-sm text-muted-foreground">
                  Suelte los archivos aquí...
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Arrastre y suelte archivos aquí, o haga clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solo archivos JSON
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader className="px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              {selectedFile?.fileName}
            </DialogTitle>
            <DialogDescription>
              Lista de productos en el archivo
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cargando contenido...</p>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-destructive">
                <p className="text-sm">Error: {previewError}</p>
              </div>
            ) : (
              <div className="relative max-h-[calc(90vh-200px)] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background border-b">
                    <TableRow>
                      {selectedFile?.content?.products && 
                       getProductColumns(selectedFile.content.products).map((column) => (
                        <TableHead 
                          key={column}
                          className={column.toLowerCase().includes('nombre') || column.toLowerCase().includes('name') ? 'w-[300px]' : ''}
                        >
                          {column.charAt(0).toUpperCase() + column.slice(1)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFile?.content?.products?.map((product, index) => {
                      const columns = selectedFile.content?.products ? 
                        getProductColumns(selectedFile.content.products) : []
                      
                      return (
                        <TableRow key={index}>
                          {columns.map((column) => (
                            <TableCell 
                              key={column}
                              className={column.toLowerCase().includes('nombre') || column.toLowerCase().includes('name') ? 'font-medium w-[300px]' : ''}
                            >
                              {formatValue(product[column])}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                    {!selectedFile?.content?.products?.length && (
                      <TableRow>
                        <TableCell colSpan={getProductColumns(selectedFile?.content?.products || []).length || 1} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileJson className="h-8 w-8" />
                            <p>No se encontraron productos en este archivo</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Logs Panel */}
      {logFile && (
        <div className="border-t">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-2">Logs de Procesamiento</h3>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[200px] font-mono whitespace-pre-wrap">
              {logs || 'Esperando logs...'}
            </pre>
          </div>
        </div>
      )}
    </SidebarInset>
  )
} 