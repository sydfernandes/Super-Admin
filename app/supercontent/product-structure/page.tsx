"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  defaultDropAnimation,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  GripVertical,
  CirclePlus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductStructureSidebar } from "./sidebar"
import type { TreeItem, BaseFieldItem, FieldAction, FieldItemType } from "./types";
import { ProductFieldItem as FieldItem } from "./field-item";

/** ---------------------------------------------------------------------------------
 * 1. Data Types
 * --------------------------------------------------------------------------------- */
interface DragIntention {
  type: "before" | "after" | "child" | "root";
  id: string;
}

/** Props for the top-level ProductStructure container */
interface ProductStructureProps {
  className?: string;
  onDataUpdate?: (data: { items: TreeItem[] }) => void;
}

/** ---------------------------------------------------------------------------------
 * 2. Constants
 * --------------------------------------------------------------------------------- */
const INDENT_SIZE = 24;
const UNPARENT_THRESHOLD = -20;
const CHILD_THRESHOLD = 20;
const MAX_DEPTH = 3;
const GAP_SIZE = 8;

const GHOST_LINE_THICKNESS = 2;
const GHOST_DOT_SIZE = 6;
const GHOST_LINE_CLASSES = "absolute pointer-events-none transition-all duration-200";
const GHOST_LINE_ACTIVE_CLASSES = "bg-primary shadow-sm";
const GHOST_DOT_CLASSES = "absolute top-1/2 rounded-full transition-all duration-200";
const GHOST_DOT_ACTIVE_CLASSES = "bg-primary shadow-sm";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "timestamp", label: "Timestamp" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "image", label: "Image" },
  { value: "currency", label: "Currency" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi Select" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "color", label: "Color" }
];

/** ---------------------------------------------------------------------------------
 * 3. FieldItem: Single Node
 * --------------------------------------------------------------------------------- */
function ProductFieldItem({
  item,
  depth,
  activeId,
  overId,
  currentPosition,
  onDelete,
  onRename,
  onTypeChange,
  onRequiredChange,
}: ProductFieldItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({
    id: item.id,
  });

  const style = {
    marginLeft: `${depth * INDENT_SIZE}px`,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = async () => {
    if (editValue.trim() !== item.name) {
      await onRename(item.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setEditValue(item.name);
      setIsEditing(false);
    }
  };

  // Ghost line states
  const isTargetItem = overId === item.id;
  const showGhostBefore = isTargetItem && currentPosition?.type === "before";
  const showGhostAfter = isTargetItem && currentPosition?.type === "after";
  const showGhostChild = isTargetItem && currentPosition?.type === "child";
  const showGhostRoot = isTargetItem && currentPosition?.type === "root";

  const ROW_HEIGHT = 48;

  const getLineStyle = (indentLevel: number) => ({
    left: `${indentLevel * INDENT_SIZE}px`,
    right: 0,
    height: `${GHOST_LINE_THICKNESS}px`,
    zIndex: 10,
  });

  const getDotStyle = (isLeft: boolean) => ({
    width: `${GHOST_DOT_SIZE}px`,
    height: `${GHOST_DOT_SIZE}px`,
    transform: `translate(${isLeft ? "-50%" : "50%"}, -50%)`,
    ...(isLeft ? { left: 0 } : { right: 0 }),
  });

  if (isDragging) {
    return <div style={style} className="h-12" />;
  }

  return (
    <div className="relative">
      {showGhostRoot && (
        <div
          className={cn(GHOST_LINE_CLASSES, GHOST_LINE_ACTIVE_CLASSES)}
          style={{
            top: `${-GAP_SIZE / 2}px`,
            left: 0,
            right: 0,
            height: `${GHOST_LINE_THICKNESS}px`,
            zIndex: 10,
          }}
        >
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(true)}
          />
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(false)}
          />
        </div>
      )}

      {showGhostBefore && (
        <div
          className={cn(GHOST_LINE_CLASSES, GHOST_LINE_ACTIVE_CLASSES)}
          style={{
            ...getLineStyle(depth),
            top: `${-GAP_SIZE / 2}px`,
          }}
        >
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(true)}
          />
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(false)}
          />
        </div>
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative flex items-center gap-2 h-12 px-4 rounded-lg border transition-colors duration-200",
          "bg-background hover:bg-accent/5",
          isOver && "bg-accent/10",
          activeId === item.id && "opacity-50"
        )}
      >
        {item.children.length > 0 && (
          <button
            className="p-0.5 hover:bg-muted rounded-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        )}

        <button
          className="touch-none p-1 opacity-60 hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-8"
          />
        ) : (
          <span className="flex-1 truncate">{item.name}</span>
        )}

        <Select
          value={item.type}
          onValueChange={(value) => onTypeChange(item.id, value as BaseFieldItem["type"])}
        >
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm">Required</span>
          <Switch
            checked={item.required}
            onCheckedChange={(checked) => onRequiredChange(item.id, checked)}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent/10"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {showGhostChild && (
          <div
            className={cn(GHOST_LINE_CLASSES, GHOST_LINE_ACTIVE_CLASSES)}
            style={{
              ...getLineStyle(depth + 1),
              top: `${item.children.length ? -GAP_SIZE / 2 : ROW_HEIGHT}px`,
            }}
          >
            <div
              className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
              style={getDotStyle(true)}
            />
            <div
              className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
              style={getDotStyle(false)}
            />
          </div>
        )}
      </div>

      {showGhostAfter && !showGhostChild && (
        <div
          className={cn(GHOST_LINE_CLASSES, GHOST_LINE_ACTIVE_CLASSES)}
          style={{
            ...getLineStyle(depth),
            top: `${ROW_HEIGHT + GAP_SIZE / 2}px`,
          }}
        >
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(true)}
          />
          <div
            className={cn(GHOST_DOT_CLASSES, GHOST_DOT_ACTIVE_CLASSES)}
            style={getDotStyle(false)}
          />
        </div>
      )}

      {item.children.length > 0 && isExpanded && (
        <div className="flex flex-col gap-2 mt-2">
          {item.children.map((child) => (
            <FieldItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeId={activeId}
              overId={overId}
              currentPosition={currentPosition}
              onDelete={onDelete}
              onRename={onRename}
              onTypeChange={onTypeChange}
              onRequiredChange={onRequiredChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** ---------------------------------------------------------------------------------
 * 4. ProductStructure (Main)
 * --------------------------------------------------------------------------------- */
export function ProductStructure({ className, onDataUpdate }: ProductStructureProps) {
  const [items, setItems] = useState<BaseFieldItem[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const { toast } = useToast();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Convert flat list to tree structure
  const buildTree = useCallback((flatItems: BaseFieldItem[]): TreeItem[] => {
    const itemMap = new Map<string, TreeItem>();
    const rootItems: TreeItem[] = [];

    // First pass: Create TreeItems without children
    flatItems.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: Build the tree structure
    flatItems.forEach(item => {
      const treeItem = itemMap.get(item.id)!;
      if (item.parentId === null) {
        rootItems.push(treeItem);
      } else {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children.push(treeItem);
        }
      }
    });

    return rootItems;
  }, []);

  // Convert tree structure to flat list
  const flattenTree = useCallback((treeItems: TreeItem[]): BaseFieldItem[] => {
    const flatItems: BaseFieldItem[] = [];
    
    const flatten = (items: TreeItem[], parentId: string | null = null) => {
      items.forEach(item => {
        const { children, ...rest } = item;
        flatItems.push({ ...rest, parentId });
        flatten(children, item.id);
      });
    };

    flatten(treeItems);
    return flatItems;
  }, []);

  const saveFields = useCallback(async (newItems: BaseFieldItem[]) => {
    try {
      const response = await fetch("/api/product-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: newItems }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save fields: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to save fields:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save fields. Your changes may not be persisted.",
      });
    }
  }, [toast]);

  const addToHistory = useCallback(async (action: Omit<FieldAction, "id" | "timestamp" | "user">) => {
    const newAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: {
        id: "u_01HNK2E8YRJX9QWM5390VEXZK4",
        name: "Sydney Fernandes"
      }
    };

    try {
      const response = await fetch("/api/product-structure/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newAction }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save history: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save history:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save action history. Some actions may not be recorded.",
      });
    }
  }, [toast]);

  useEffect(() => {
    async function loadFields() {
      try {
        const response = await fetch("/api/product-structure");
        if (!response.ok) {
          throw new Error(`Failed to load fields: ${response.statusText}`);
        }
        const data = await response.json();
        setItems(data.fields || []);
      } catch (err) {
        console.error("Failed to load fields:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load fields. Please refresh the page.",
        });
      }
    }
    loadFields();
  }, [toast]);

  const handleAddField = () => {
    if (!newFieldName.trim()) return;

    const newField: BaseFieldItem = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: "text",
      required: false,
      parentId: null,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active"
      }
    };

    const updated = [...items, newField];
    setItems(updated);
    saveFields(updated);
    setNewFieldName("");

    addToHistory({
      action: "FIELD_CREATED",
      details: {
        message: `Created field "${newField.name}"`,
        affectedFields: {
          target: {
            id: newField.id,
            name: newField.name
          }
        }
      },
      field: newField
    });
  };

  const handleDelete = useCallback(async (id: string) => {
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete) return;

    try {
      // Get all descendant IDs
      const descendantIds = new Set<string>();
      const getAllDescendants = (parentId: string) => {
        items.forEach((item) => {
          if (item.parentId === parentId) {
            descendantIds.add(item.id);
            getAllDescendants(item.id);
          }
        });
      };
      getAllDescendants(id);
      descendantIds.add(id);

      const newItems = items.filter(item => !descendantIds.has(item.id));
      setItems(newItems);
      await saveFields(newItems);

      addToHistory({
        action: "FIELD_DELETED",
        details: {
          message: `Deleted field "${itemToDelete.name}" and its descendants`,
          affectedFields: {
            target: {
              id: itemToDelete.id,
              name: itemToDelete.name
            }
          }
        },
        field: itemToDelete
      });
    } catch (err) {
      console.error("Failed to delete field:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete field. Please try again.",
      });
    }
  }, [items, saveFields, addToHistory, toast]);

  const treeItems = useMemo(() => buildTree(items), [items, buildTree]);

  useEffect(() => {
    onDataUpdate?.({ items: treeItems });
  }, [treeItems, onDataUpdate]);

  return (
    <div className={cn("flex-1", className)}>
      <div>
        <div className="space-y-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Product Structure</h2>
            <p className="text-sm text-muted-foreground">
              Define the structure of your product data with custom fields
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddField()}
              placeholder="Add new field"
              className="h-9"
            />
            <Button variant="default" size="default" onClick={handleAddField}>
              <CirclePlus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {treeItems.map((item) => (
            <FieldItem
              key={item.id}
              item={item}
              depth={0}
              onDelete={handleDelete}
              onRename={async (id: string, newName: string) => {
                const newItems = items.map(item =>
                  item.id === id ? { ...item, name: newName } : item
                );
                setItems(newItems);
                await saveFields(newItems);
              }}
              onTypeChange={async (id: string, newType: BaseFieldItem["type"]) => {
                const oldItem = items.find(x => x.id === id);
                if (!oldItem) return;

                const newItems = items.map(item =>
                  item.id === id ? { ...item, type: newType } : item
                );
                setItems(newItems);
                await saveFields(newItems);

                addToHistory({
                  action: "FIELD_TYPE_CHANGED",
                  details: {
                    message: `Changed "${oldItem.name}" type from ${oldItem.type} to ${newType}`,
                    affectedFields: {
                      target: {
                        id: oldItem.id,
                        name: oldItem.name
                      }
                    }
                  },
                  field: { ...oldItem, type: newType },
                  changes: {
                    previousState: { type: oldItem.type },
                    newState: { type: newType }
                  }
                });
              }}
              onRequiredChange={async (id: string, required: boolean) => {
                const oldItem = items.find(x => x.id === id);
                if (!oldItem) return;

                const newItems = items.map(item =>
                  item.id === id ? { ...item, required } : item
                );
                setItems(newItems);
                await saveFields(newItems);

                addToHistory({
                  action: "FIELD_REQUIRED_CHANGED",
                  details: {
                    message: `Changed "${oldItem.name}" required status to ${required ? "required" : "optional"}`,
                    affectedFields: {
                      target: {
                        id: oldItem.id,
                        name: oldItem.name
                      }
                    }
                  },
                  field: { ...oldItem, required },
                  changes: {
                    previousState: { required: oldItem.required },
                    newState: { required }
                  }
                });
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Main Page Component
 */
export default function ProductStructurePage() {
  const [items, setItems] = useState<BaseFieldItem[]>([])
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280)
      if (window.innerWidth < 1280) {
        setIsHistoryExpanded(false)
      }
    }

    // Check initial size
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="min-h-screen flex relative">
      <div className={cn(
        "flex-1 transition-all duration-200",
        isHistoryExpanded && !isMobile && "mr-[450px]"
      )}>
        <ProductStructure 
          className="p-8"
          onDataUpdate={({ items }) => setItems(items)} 
        />
      </div>

      <div className={cn(
        "fixed right-0 top-0 h-screen transition-all duration-200 transform",
        isHistoryExpanded ? "translate-x-0" : "translate-x-full",
        isMobile && "w-full max-w-[450px]"
      )}>
        <ProductStructureSidebar
          fields={items}
          className="h-full"
          isExpanded={isHistoryExpanded}
          onExpandToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
        />
      </div>

      {/* Overlay for mobile */}
      {isMobile && isHistoryExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsHistoryExpanded(false)}
        />
      )}

      {/* Toggle button for mobile */}
      {isMobile && !isHistoryExpanded && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setIsHistoryExpanded(true)}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
} 