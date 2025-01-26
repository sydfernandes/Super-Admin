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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryHistory } from "./history";
import { CategoriesSidebar } from "./sidebar";

/** ---------------------------------------------------------------------------------
 * 1. Data Types
 * --------------------------------------------------------------------------------- */
interface TreeItem {
  id: string;
  name: string;
  parentId: string | null;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

/** Props for each item (node) in the tree */
interface CategoryTreeItemProps {
  item: TreeItem;
  depth: number;
  activeId: string | null;
  overId: string | null;
  currentPosition: DragIntention | null;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  allItems: TreeItem[];
}

/** Props for the top-level CategoryTree container */
interface CategoryTreeProps {
  className?: string;
  onDataUpdate?: (data: { items: TreeItem[]; history: CategoryAction[] }) => void;
}

/** Interface for history log */
export interface CategoryAction {
  id: string;
  timestamp: string;
  action: "CATEGORY_CREATED" | "SUBCATEGORY_ADDED" | "SUBCATEGORY_MOVED" | "CATEGORY_RENAMED" | "CATEGORY_REMOVED" | "SUBCATEGORY_REMOVED" | "ORDER_CHANGED" | "PROPERTY_ASSIGNED" | "CATEGORY_ACTIVATED" | "CATEGORY_DEACTIVATED";
  details: {
    message: string;
    affectedCategories: {
      target?: {
        id: string;
        name: string;
        path?: string | undefined;
      };
      previousParent?: {
        id: string;
        name: string;
      };
      newParent?: {
        id: string;
        name: string;
      };
    };
  };
  user: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    path?: string | undefined;
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      deletedAt?: string;
      status?: "active" | "inactive";
    };
  };
  changes?: {
    previousState?: {
      parentId?: string;
      position?: number;
      depth?: number;
      path?: string | undefined;
      status?: "active" | "inactive";
    };
    newState?: {
      parentId?: string;
      position?: number;
      depth?: number;
      path?: string | undefined;
      status?: "active" | "inactive";
    };
  };
}

/** Update the CategoryHistoryProps interface */
interface CategoryHistoryProps {
  history: CategoryAction[];
  categories: TreeItem[];
  className?: string;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

/** Interface for drag intention */
interface DragIntention {
  type: "before" | "after" | "child" | "root";
  id: string;
}

/** ---------------------------------------------------------------------------------
 * 2. Constants
 * --------------------------------------------------------------------------------- */
const INDENT_SIZE = 24;
const UNPARENT_THRESHOLD = -20; // how far left to drag to force root-level
const CHILD_THRESHOLD = 20;     // how far right to drag to nest as a child
const MAX_DEPTH = 5;
const GAP_SIZE = 8;            // 0.5rem (gap-2) in pixels
const ROW_HEIGHT = 48;         // h-12 equals 48px

/** Constants for visual feedback */
const GHOST_LINE_THICKNESS = 2; // px
const GHOST_DOT_SIZE = 6;       // px
const GHOST_LINE_CLASSES =
  "absolute pointer-events-none transition-all duration-200";
const GHOST_LINE_ACTIVE_CLASSES = "bg-primary shadow-sm";
const GHOST_DOT_CLASSES =
  "absolute top-1/2 rounded-full transition-all duration-200";
const GHOST_DOT_ACTIVE_CLASSES = "bg-primary shadow-sm";

/** Helper functions for visual feedback */
function getLineStyle(indentLevel: number) {
  return {
    left: `${indentLevel * INDENT_SIZE}px`,
    right: 0,
    height: `${GHOST_LINE_THICKNESS}px`,
    zIndex: 10,
  };
}

function getDotStyle(isLeft: boolean) {
  return {
    width: `${GHOST_DOT_SIZE}px`,
    height: `${GHOST_DOT_SIZE}px`,
    transform: `translate(${isLeft ? "-50%" : "50%"}, -50%)`,
    ...(isLeft ? { left: 0 } : { right: 0 }),
  };
}

/** ---------------------------------------------------------------------------------
 * 4. Helper Functions
 * --------------------------------------------------------------------------------- */
function getChildItems(items: TreeItem[], parentId: string): TreeItem[] {
  return items.filter(item => item.parentId === parentId);
}

function countSubcategories(items: TreeItem[]): number {
  return items.filter(item => item.parentId !== null).length;
}

function getRootCategories(items: TreeItem[]): TreeItem[] {
  return items.filter(item => item.parentId === null);
}

function findItemById(items: TreeItem[], id: string): TreeItem | undefined {
  return items.find(item => item.id === id);
}

function isDescendant(items: TreeItem[], parentId: string | null, childId: string): boolean {
  if (!parentId) return false;
  const child = items.find(item => item.id === childId);
  if (!child) return false;
  if (child.parentId === parentId) return true;
  if (!child.parentId) return false;
  return isDescendant(items, parentId, child.parentId);
}

function getDepth(items: TreeItem[], id: string): number {
  let depth = 0;
  let current = items.find(item => item.id === id);
  while (current?.parentId) {
    depth++;
    const parent = items.find(item => item.id === current!.parentId);
    if (!parent) break;
    current = parent;
  }
  return depth;
}

/** ---------------------------------------------------------------------------------
 * 3. File System Operations
 * --------------------------------------------------------------------------------- */
async function saveCategories(categories: TreeItem[]) {
  try {
    console.log('Saving categories:', categories); // Debug log
    const response = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        categories: categories.map(category => ({
          id: category.id,
          name: category.name,
          // Preserve the exact parentId value
          parentId: category.parentId,
          metadata: category.metadata || {}
        }))
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save categories');
    }
    
    const result = await response.json();
    console.log('Save result:', result); // Debug log
    return result;
  } catch (error) {
    console.error('Error saving categories:', error);
    throw error;
  }
}

async function loadCategories(): Promise<TreeItem[]> {
  try {
    const response = await fetch("/api/categories");
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load categories');
    }
    const data = await response.json();
    console.log('Raw data from API:', data); // Debug log
    
    // Transform data ensuring all fields are present and parentId is preserved
    const transformedCategories = data.categories.map((category: TreeItem) => ({
      id: category.id,
      name: category.name,
      // Only set parentId to null if it's explicitly undefined or null
      parentId: category.parentId === undefined || category.parentId === null ? null : category.parentId,
      metadata: category.metadata || {}
    }));
    
    console.log('Transformed categories:', transformedCategories); // Debug log
    return transformedCategories;
  } catch (error) {
    console.error('Error loading categories:', error);
    throw error;
  }
}

async function addToHistory(action: CategoryAction) {
  try {
    const response = await fetch("/api/categories/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: {
        ...action,
        timestamp: new Date().toISOString(),
        id: action.id || crypto.randomUUID(),
        user: {
          id: "current-user",
          name: "Current User"
        }
      }}),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving history:', error);
    throw error;
  }
}

async function loadHistory(): Promise<CategoryAction[]> {
  try {
    const response = await fetch("/api/categories/history");
    if (!response.ok) {
      throw new Error('Failed to load history');
    }
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

/** ---------------------------------------------------------------------------------
 * 5. CategoryTreeItem Component
 * --------------------------------------------------------------------------------- */
function CategoryTreeItem({
  item,
  depth,
  activeId,
  overId,
  currentPosition,
  onDelete,
  onRename,
  allItems
}: CategoryTreeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  /** dnd-kit: useSortable hook */
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

  // Get child items
  const childItems = useMemo(() => {
    return allItems.filter(child => child.parentId === item.id);
  }, [allItems, item.id]);
  
  const hasChildren = childItems.length > 0;

  // Ghost line states
  const isTargetItem = overId === item.id;
  const showGhostBefore = isTargetItem && currentPosition?.type === "before";
  const showGhostAfter = isTargetItem && currentPosition?.type === "after";
  const showGhostChild = isTargetItem && currentPosition?.type === "child";
  const showGhostRoot = isTargetItem && currentPosition?.type === "root";

  // Return empty space if the item is currently being dragged
  if (isDragging) {
    return <div style={style} className="h-12" />;
  }

  return (
    <div className="relative">
      {/* Root line (making item root-level) */}
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

      {/* Before line */}
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

      {/* Actual row */}
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
        {/* Expand/Collapse button */}
        {hasChildren && (
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

        {/* Drag handle */}
        <button
          className="touch-none p-1 opacity-60 hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Name field */}
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

        {/* Actions */}
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
      </div>

      {/* After line */}
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

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col gap-2 mt-2">
          {childItems.map((child) => (
            <CategoryTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeId={activeId}
              overId={overId}
              currentPosition={currentPosition}
              onDelete={onDelete}
              onRename={onRename}
              allItems={allItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** ---------------------------------------------------------------------------------
 * 5. CategoryTree Component
 * --------------------------------------------------------------------------------- */
export function CategoryTree({ className, onDataUpdate }: CategoryTreeProps) {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [history, setHistory] = useState<CategoryAction[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<DragIntention | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toast } = useToast();

  /** DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [categoriesData, historyData] = await Promise.all([
          loadCategories(),
          loadHistory()
        ]);
        console.log('Loaded categories:', categoriesData); // Debug log
        setItems(categoriesData);
        setHistory(historyData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeData();
  }, [toast]);

  // Debug log when items change
  useEffect(() => {
    console.log('Current items:', items);
    console.log('Root categories:', getRootCategories(items));
    console.log('Subcategories count:', countSubcategories(items));
  }, [items]);

  // Update parent component when data changes
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate({ items, history });
    }
  }, [items, history, onDataUpdate]);

  /** Drag-and-drop handlers */
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id.toString());
  }

  function handleDragMove({ delta, over }: DragMoveEvent) {
    setOffsetLeft(delta.x);
    if (over) {
      setOverId(over.id.toString());
    }
  }

  /**
   * APPROACH B: Always nest if horizontally beyond CHILD_THRESHOLD.
   * This makes it much easier to drop deeper items without precise vertical zones.
   */
  function handleDragOver({ over, active }: DragOverEvent) {
    if (!over || !over.rect) {
      setCurrentPosition(null);
      return;
    }

    const overId = over.id.toString();
    const activeId = active.id.toString();

    if (overId === activeId) {
      setCurrentPosition(null);
      return;
    }

    // Get the items
    const src = items.find((x) => x.id === activeId);
    const tgt = items.find((x) => x.id === overId);
    if (!src || !tgt) {
      setCurrentPosition(null);
      return;
    }

    // Prevent dragging into its own descendant
    const isDescendant = (parentId: string | null, childId: string): boolean => {
      if (!parentId) return false;
      const child = items.find(item => item.id === childId);
      if (!child) return false;
      if (child.parentId === parentId) return true;
      return isDescendant(parentId, child.parentId!);
    };

    if (isDescendant(activeId, overId)) {
      setCurrentPosition(null);
      return;
    }

    // Get the depth of the target item
    const getDepth = (id: string): number => {
      let depth = 0;
      let current = items.find(item => item.id === id);
      while (current && current.parentId) {
        depth++;
        current = items.find(item => item.id === current!.parentId);
      }
      return depth;
    };

    const overDepth = getDepth(overId);

    // Get bounding rects
    const overRect = over.rect;
    const activeRect = active.rect.current?.translated;
    if (!activeRect || !overRect.height) {
      setCurrentPosition(null);
      return;
    }

    // Vertical approach for before/after
    const pointerY = activeRect.top;
    const offsetY = Math.max(0, Math.min(pointerY - overRect.top, overRect.height));
    const relativeY = offsetY / overRect.height;

    // If dragged far to the left, attempt root-level
    if (offsetLeft < UNPARENT_THRESHOLD && src.parentId) {
      // If target is root, reorder before/after it
      if (!tgt.parentId) {
        if (relativeY < 0.5) {
          setCurrentPosition({ type: "before", id: overId });
        } else {
          setCurrentPosition({ type: "after", id: overId });
        }
      } else {
        // Otherwise, just force to root level
        setCurrentPosition({ type: "root", id: overId });
      }
      return;
    }

    // If dragged far to the right, nest as child (if within depth)
    if (offsetLeft > CHILD_THRESHOLD && overDepth < MAX_DEPTH - 1) {
      setCurrentPosition({ type: "child", id: overId });
      return;
    }

    // Otherwise, decide before/after based purely on mid-point
    if (relativeY < 0.5) {
      setCurrentPosition({ type: "before", id: overId });
    } else {
      setCurrentPosition({ type: "after", id: overId });
    }
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || !currentPosition) {
      resetDrag();
      return;
    }

    const activeItem = items.find(item => item.id === active.id);
    const overItem = items.find(item => item.id === over.id);

    if (!activeItem || !overItem) {
      resetDrag();
      return;
    }

    try {
      console.log('Drag end - Current position:', currentPosition); // Debug log
      console.log('Active item:', activeItem);
      console.log('Over item:', overItem);

      // Create a copy of the current items
      let newItems = [...items];
      
      // Update the parentId based on the drop position
      const updatedItem = {
        ...activeItem,
        parentId: currentPosition.type === "child" ? overItem.id :
                 currentPosition.type === "root" ? null :
                 overItem.parentId
      };

      console.log('Updated item:', updatedItem); // Debug log

      // Find the index where to insert the item
      const overIndex = newItems.findIndex(item => item.id === overItem.id);
      const newIndex = currentPosition.type === "after" ? overIndex + 1 : overIndex;

      // Remove the item from its current position
      newItems = newItems.filter(item => item.id !== activeItem.id);
      
      // Insert the item at the new position
      newItems.splice(newIndex, 0, updatedItem);

      console.log('New items array:', newItems); // Debug log

      // Update the state
      setItems(newItems);

      // Save to the server
      await saveCategories(newItems);

      // Add to history
      const historyEntry: CategoryAction = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: "SUBCATEGORY_MOVED",
        details: {
          message: `Moved category "${activeItem.name}" to ${currentPosition.type} "${overItem.name}"`,
          affectedCategories: {
            target: {
              id: activeItem.id,
              name: activeItem.name,
            },
            previousParent: activeItem.parentId ? {
              id: activeItem.parentId,
              name: items.find(item => item.id === activeItem.parentId)?.name || "",
            } : undefined,
            newParent: updatedItem.parentId ? {
              id: updatedItem.parentId,
              name: items.find(item => item.id === updatedItem.parentId)?.name || "",
            } : undefined,
          },
        },
        user: {
          id: "current-user",
          name: "Current User",
        },
        category: {
          id: activeItem.id,
          name: activeItem.name,
        },
        changes: {
          previousState: {
            parentId: activeItem.parentId || undefined,
          },
          newState: {
            parentId: updatedItem.parentId || undefined,
          },
        },
      };

      setHistory(prev => [historyEntry, ...prev]);
      await addToHistory(historyEntry);

    } catch (error) {
      console.error("Failed to update category position:", error);
      toast({
        title: "Error",
        description: "Failed to update category position. Please try again.",
        variant: "destructive",
      });
    }

    resetDrag();
  }

  function resetDrag() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
  }

  /** Handle category creation */
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategory: TreeItem = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      parentId: null,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active"
      }
    };

    try {
      const newItems = [...items, newCategory];
      await saveCategories(newItems);
      setItems(newItems);
      setNewCategoryName("");

      const historyEntry = createHistoryEntry(
        "CATEGORY_CREATED",
        {
          message: `Created new category "${newCategory.name}"`,
          affectedCategories: {
            target: {
              id: newCategory.id,
              name: newCategory.name,
              path: `/${newCategory.name.toLowerCase()}`,
            },
          },
        },
        {
          id: newCategory.id,
          name: newCategory.name,
          path: `/${newCategory.name.toLowerCase()}`,
          metadata: newCategory.metadata
        }
      );
      
      await addToHistory(historyEntry);
      setHistory(prev => [historyEntry, ...prev]);
      
      toast({
        title: "Success",
        description: `Category "${newCategory.name}" created successfully.`,
      });
    } catch (error) {
      console.error("Failed to create category:", error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    }
  };

  /** Handle category deletion */
  const handleDelete = useCallback(
    async (id: string) => {
      const itemToDelete = items.find(item => item.id === id);
      if (!itemToDelete) return;

      try {
        // Get all descendant IDs
        const getAllDescendants = (parentId: string): string[] => {
          const children = items.filter(item => item.parentId === parentId);
          return children.reduce((acc, child) => {
            return [...acc, child.id, ...getAllDescendants(child.id)];
          }, [] as string[]);
        };

        const descendantIds = getAllDescendants(id);
        const idsToRemove = new Set([id, ...descendantIds]);

        const newItems = items.filter(x => !idsToRemove.has(x.id));
        await saveCategories(newItems);
        setItems(newItems);

        const historyEntry = createHistoryEntry(
          descendantIds.length > 0 ? "SUBCATEGORY_REMOVED" : "CATEGORY_REMOVED",
          {
            message: `Removed category "${itemToDelete.name}" and ${descendantIds.length} subcategories`,
            affectedCategories: {
              target: {
                id: itemToDelete.id,
                name: itemToDelete.name,
                path: itemToDelete.parentId ? `/${itemToDelete.name.toLowerCase()}` : undefined,
              },
            },
          },
          {
            id: itemToDelete.id,
            name: itemToDelete.name,
            path: itemToDelete.parentId ? `/${itemToDelete.name.toLowerCase()}` : undefined,
            metadata: {
              ...itemToDelete.metadata,
              deletedAt: new Date().toISOString(),
              status: "inactive",
            },
          }
        );
        
        await addToHistory(historyEntry);
        setHistory(prev => [historyEntry, ...prev]);
        
        toast({
          title: "Success",
          description: `Category "${itemToDelete.name}" deleted successfully.`,
        });
      } catch (error) {
        console.error("Failed to delete category:", error);
        toast({
          title: "Error",
          description: "Failed to delete category. Please try again.",
          variant: "destructive",
        });
      }
    },
    [items, toast]
  );

  const handleRename = useCallback(
    async (id: string, newName: string) => {
      const itemToRename = items.find(item => item.id === id);
      if (!itemToRename) return;

      try {
        const updatedItems = items.map((item) =>
          item.id === id ? { ...item, name: newName } : item
        );
        setItems(updatedItems);

        await saveCategories(updatedItems);
        const historyEntry = createHistoryEntry(
          "CATEGORY_RENAMED",
          {
            message: `Renamed category from "${itemToRename.name}" to "${newName}"`,
            affectedCategories: {
              target: {
                id: itemToRename.id,
                name: newName,
                path: itemToRename.parentId
                  ? `/${newName.toLowerCase()}`
                  : undefined,
              },
            },
          },
          {
            id: itemToRename.id,
            name: newName,
            path: itemToRename.parentId
              ? `/${newName.toLowerCase()}`
              : undefined,
            metadata: {
              updatedAt: new Date().toISOString(),
              status: "active",
            },
          },
          {
            previousState: {
              path: itemToRename.parentId
                ? `/${itemToRename.name.toLowerCase()}`
                : undefined,
            },
            newState: {
              path: itemToRename.parentId
                ? `/${newName.toLowerCase()}`
                : undefined,
            },
          }
        );
        await addToHistory(historyEntry);
      } catch (error) {
        console.error("Failed to rename category:", error);
        toast({
          title: "Error",
          description: "Failed to rename category. Please try again.",
          variant: "destructive",
        });
      }
    },
    [items, toast]
  );

  return (
    <div className={cn("flex-1", className)}>
      {/* Main Content */}
      <div>
        {/* Header & Add New Category */}
        <div className="space-y-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Categories</h2>
            <p className="text-sm text-muted-foreground">
              Organize your products with a flexible category structure
            </p>
            <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
              <span>{getRootCategories(items).length} main categories</span>
              <span>•</span>
              <span>{countSubcategories(items)} subcategories</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="Add new category"
              className="h-9"
            />
            <Button variant="default" size="default" onClick={handleAddCategory}>
              <CirclePlus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Category Tree */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          <div className="flex flex-col gap-2">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No categories yet. Create your first category above.
              </div>
            ) : (
              getRootCategories(items).map((item) => (
                <CategoryTreeItem
                  key={item.id}
                  item={item}
                  depth={0}
                  activeId={activeId}
                  overId={overId}
                  currentPosition={currentPosition}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  allItems={items}
                />
              ))
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={defaultDropAnimation}>
            {activeId && (
              <div className="bg-background border rounded-md p-2 opacity-80">
                {items.find((it) => it.id === activeId)?.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

/**
 * Main Page Component
 */
export default function CategoriesPage() {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [history, setHistory] = useState<CategoryAction[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, historyData] = await Promise.all([
          loadCategories(),
          loadHistory()
        ]);
        setItems(categoriesData);
        setHistory(historyData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex">
      <CategoryTree />
      <div className="flex gap-[1px] h-screen">
        <div className="w-[1px] bg-border" />
        <div className="w-[1px] bg-border" />
      </div>
      <CategoriesSidebar
        activeTab="categories"
        categories={items}
        actionHistory={history}
        className="w-[400px]"
      />
    </div>
  );
}

// Helper function to create history entries
function createHistoryEntry(
  action: CategoryAction["action"],
  details: Omit<CategoryAction["details"], "user">,
  category: Omit<CategoryAction["category"], "user">,
  changes?: CategoryAction["changes"]
): CategoryAction {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
    category,
    changes,
    user: {
      id: "current-user",
      name: "Current User",
    },
  };
}