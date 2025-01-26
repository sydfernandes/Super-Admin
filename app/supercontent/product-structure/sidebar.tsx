"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { RightSidebar } from "@/components/ui/right-sidebar"
import { ProductStructureHistory } from "./history"

interface FieldItem {
  id: string
  name: string
  type: "text" | "number" | "boolean" | "date" | "select" | "multiselect" | "url" | "timestamp" | "email" | "image" | "currency" | "phone" | "json" | "markdown" | "color"
  required: boolean
  parentId: string | undefined
  children: FieldItem[]
  metadata?: {
    createdAt?: string
    updatedAt?: string
    deletedAt?: string
    status?: "active" | "inactive"
  }
}

interface FieldAction {
  id: string
  timestamp: string
  action: "FIELD_CREATED" | "FIELD_UPDATED" | "FIELD_DELETED" | "FIELD_MOVED" | "FIELD_REQUIRED_CHANGED" | "FIELD_TYPE_CHANGED"
  details: {
    message: string
    affectedFields: {
      target: {
        id: string
        name: string
      }
    }
  }
  user: {
    id: string
    name: string
  }
  field: {
    id: string
    name: string
    type: string
    required: boolean
    metadata?: {
      createdAt?: string
      updatedAt?: string
      deletedAt?: string
      status?: "active" | "inactive"
    }
  }
  changes?: {
    previousState?: {
      type?: string
      required?: boolean
      parentId?: string
      position?: number
    }
    newState?: {
      type?: string
      required?: boolean
      parentId?: string
      position?: number
    }
  }
}

interface ProductStructureSidebarProps {
  className?: string
  fields: FieldItem[]
  isExpanded?: boolean
  onExpandToggle?: () => void
}

export function ProductStructureSidebar({
  className,
  fields = [],
  isExpanded = false,
  onExpandToggle,
}: ProductStructureSidebarProps) {
  const [history, setHistory] = useState<FieldAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load history when component mounts
  useEffect(() => {
    let mounted = true

    const loadHistory = async () => {
      try {
        setError(null)
        const res = await fetch("/api/product-structure/history")
        if (!res.ok) throw new Error('Failed to load history')
        const data = await res.json()
        
        if (mounted) {
          setHistory(data.history || [])
        }
      } catch (error) {
        console.error('Error loading history:', error)
        if (mounted) {
          setError('Failed to load history')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      mounted = false
    }
  }, [])

  // Count statistics including nested fields
  const countFields = (items: FieldItem[]): number => {
    return items.reduce((acc, item) => {
      return acc + 1 + countFields(item.children)
    }, 0)
  }

  const totalFields = countFields(fields)
  const requiredFields = fields.reduce((acc, field) => {
    const countRequired = (f: FieldItem): number => {
      return (f.required ? 1 : 0) + f.children.reduce((sum, child) => sum + countRequired(child), 0)
    }
    return acc + countRequired(field)
  }, 0)
  const optionalFields = totalFields - requiredFields

  // Count fields by type including nested fields
  const getFieldsByType = (items: FieldItem[]) => {
    const types: Record<string, number> = {}
    const countType = (field: FieldItem) => {
      types[field.type] = (types[field.type] || 0) + 1
      field.children.forEach(countType)
    }
    items.forEach(countType)
    return types
  }

  const fieldsByType = getFieldsByType(fields)

  return (
    <RightSidebar className={className}>
      <div className="p-6 space-y-4 flex flex-col min-h-0">
        {/* Field Statistics */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Required Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{requiredFields}</span>
                <span className="text-xs text-muted-foreground">
                  Must be filled
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Optional Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{optionalFields}</span>
                <span className="text-xs text-muted-foreground">
                  Can be empty
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Field Types Summary */}
        <div className="flex-shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Field Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(fieldsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Field History */}
        <div className="flex-1 min-h-0">
          <ProductStructureHistory 
            history={history}
            fields={fields}
            isExpanded={isExpanded}
            onExpandToggle={onExpandToggle}
            className="h-full"
          />
        </div>
      </div>
    </RightSidebar>
  )
} 