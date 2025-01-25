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
import { CalendarIcon, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryHistory } from "@/components/ui/category-history";
import { CategorySidebar } from "@/components/ui/category-sidebar";

/** ---------------------------------------------------------------------------------
 * 1. Data Types
 * --------------------------------------------------------------------------------- */
interface TreeItem {
  id: string;
  name: string;
  parentId: string | undefined;
  children: TreeItem[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

interface DragIntention {
  type: "before" | "after" | "child" | "root";
  id: string;
}

/** Props for the top-level CategoryTree container */
interface CategoryTreeProps {
  className?: string;
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
}

/** Interface for history log */
interface CategoryAction {
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

/** ---------------------------------------------------------------------------------
 * 2. Constants
 * --------------------------------------------------------------------------------- */
const INDENT_SIZE = 24;
const UNPARENT_THRESHOLD = -20; // how far left to drag to force root-level
const CHILD_THRESHOLD = 20;     // how far right to drag to nest as a child
const MAX_DEPTH = 5;
const GAP_SIZE = 8;            // 0.5rem (gap-2) in pixels

/** Constants for visual feedback */
const GHOST_LINE_THICKNESS = 2; // px
const GHOST_DOT_SIZE = 6;       // px
const GHOST_LINE_CLASSES =
  "absolute pointer-events-none transition-all duration-200";
const GHOST_LINE_ACTIVE_CLASSES = "bg-primary shadow-sm";
const GHOST_DOT_CLASSES =
  "absolute top-1/2 rounded-full transition-all duration-200";
const GHOST_DOT_ACTIVE_CLASSES = "bg-primary shadow-sm";

/** ---------------------------------------------------------------------------------
 * 3. TreeItem: Single Node
 * --------------------------------------------------------------------------------- */
function CategoryTreeItem({
  item,
  depth,
  activeId,
  overId,
  currentPosition,
  onDelete,
  onRename,
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

  // Ghost line states
  const isTargetItem = overId === item.id;
  const showGhostBefore = isTargetItem && currentPosition?.type === "before";
  const showGhostAfter = isTargetItem && currentPosition?.type === "after";
  const showGhostChild = isTargetItem && currentPosition?.type === "child";
  const showGhostRoot = isTargetItem && currentPosition?.type === "root";

  // Constants for row geometry
  const ROW_HEIGHT = 48; // h-12 equals 48px

  // Helper for line positioning
  const getLineStyle = (indentLevel: number) => ({
    left: `${indentLevel * INDENT_SIZE}px`,
    right: 0,
    height: `${GHOST_LINE_THICKNESS}px`,
    zIndex: 10,
  });

  // Helper for dot positioning
  const getDotStyle = (isLeft: boolean) => ({
    width: `${GHOST_DOT_SIZE}px`,
    height: `${GHOST_DOT_SIZE}px`,
    transform: `translate(${isLeft ? "-50%" : "50%"}, -50%)`,
    ...(isLeft ? { left: 0 } : { right: 0 }),
  });

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

        {/* Child line (nesting an item) */}
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
      {item.children.length > 0 && isExpanded && (
        <div className="flex flex-col gap-2 mt-2">
          {item.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              activeId={activeId}
              overId={overId}
              currentPosition={currentPosition}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** ---------------------------------------------------------------------------------
 * 4. CategoryTree (Main)
 * --------------------------------------------------------------------------------- */
export function CategoryTree({ className }: CategoryTreeProps) {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<DragIntention | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [actionHistory, setActionHistory] = useState<CategoryAction[]>([]);
  const { toast } = useToast();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date>();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  /** DnD sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  /** Flatten & rebuild approach (with memoization) */
  const flattenTree = useCallback(
    (list: TreeItem[], parentId: string | undefined = undefined): TreeItem[] => {
      return list.reduce<TreeItem[]>((acc, item) => {
        const copy = { ...item, parentId };
        return [...acc, copy, ...flattenTree(item.children, item.id)];
      }, []);
    },
    []
  );

  const buildTree = useCallback((flat: TreeItem[]): TreeItem[] => {
    const map = new Map<string, TreeItem>();
    for (const f of flat) {
      map.set(f.id, { ...f, children: [] });
    }
    const result: TreeItem[] = [];
    for (const f of flat) {
      if (!f.parentId) {
        result.push(map.get(f.id)!);
      } else {
        const parent = map.get(f.parentId);
        if (parent) {
          parent.children.push(map.get(f.id)!);
        }
      }
    }
    return result;
  }, []);

  /** Memoized tree data */
  const flattenedTree = useMemo(() => flattenTree(items), [items, flattenTree]);
  const flatItemsMap = useMemo(() => {
    const map = new Map<string, TreeItem>();
    flattenedTree.forEach((item) => map.set(item.id, item));
    return map;
  }, [flattenedTree]);

  /** Depth helper (BFS) */
  const getDepth = useCallback(
    (list: TreeItem[], id: string): number => {
      if (!list.length) return -1;
      const queue: Array<{ items: TreeItem[]; depth: number }> = [
        { items: list, depth: 0 },
      ];

      while (queue.length > 0) {
        const { items: currentItems, depth } = queue.shift()!;
        for (const item of currentItems) {
          if (item.id === id) return depth;
          if (item.children.length) {
            queue.push({ items: item.children, depth: depth + 1 });
          }
        }
      }
      return -1;
    },
    []
  );

  /** Check for cycles: can't drop an item into its own descendant */
  const isDescendant = useCallback(
    (items: TreeItem[], sourceId: string, targetId: string): boolean => {
      const source = items.find((x) => x.id === sourceId);
      if (!source) return false;

      function hasDescendant(tid: string, children: TreeItem[]): boolean {
        for (const child of children) {
          if (child.id === tid || hasDescendant(tid, child.children)) {
            return true;
          }
        }
        return false;
      }
      return hasDescendant(targetId, source.children);
    },
    []
  );

  /** Filter history items */
  const filteredHistory = useMemo(() => {
    return actionHistory.filter(action => {
      // Date filter
      if (dateFilter) {
        const actionDate = new Date(action.timestamp);
        if (
          actionDate.getDate() !== dateFilter.getDate() ||
          actionDate.getMonth() !== dateFilter.getMonth() ||
          actionDate.getFullYear() !== dateFilter.getFullYear()
        ) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter && action.category.id !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [actionHistory, dateFilter, categoryFilter]);

  /** API calls */
  const saveCategories = useCallback(
    async (newItems: TreeItem[]) => {
      try {
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: newItems }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save categories: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Failed to save categories:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to save categories. Your changes may not be persisted.",
        });
      }
    },
    [toast]
  );

  const addToHistory = useCallback(
    async (action: Omit<CategoryAction, "id" | "timestamp" | "user">) => {
      const newAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: {
          id: "u_01HNK2E8YRJX9QWM5390VEXZK4", // This should be replaced with actual user ID
          name: "Sydney Fernandes"
        }
      };

      // Update local state first for immediate feedback
      setActionHistory((prev) => [newAction, ...prev]);

      try {
        const response = await fetch("/api/categories/history", {
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
          description:
            "Failed to save action history. Some actions may not be recorded.",
        });
        // Roll back the state update if saving fails
        setActionHistory((prev) => prev.filter((item) => item.id !== newAction.id));
      }
    },
    [toast]
  );

  /** Load categories & history on mount */
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error(`Failed to load categories: ${response.statusText}`);
        }
        const data = await response.json();
        setItems(data.categories || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load categories. Please refresh the page.",
        });
      }
    }
    loadCategories();
  }, [toast]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/categories/history");
        if (!response.ok) {
          throw new Error(`Failed to load history: ${response.statusText}`);
        }
        const data = await response.json();
        setActionHistory(data.history || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load action history. Please refresh the page.",
        });
      }
    }
    loadHistory();
  }, [toast]);

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

    const src = flatItemsMap.get(activeId);
    const tgt = flatItemsMap.get(overId);
    if (!src || !tgt) {
      setCurrentPosition(null);
      return;
    }

    // Prevent dragging into its own descendant
    if (isDescendant(items, activeId, overId)) {
      setCurrentPosition(null);
      return;
    }

    const overDepth = getDepth(items, overId);

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

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || !currentPosition) {
      resetDrag();
      return;
    }

    const activeId = active.id.toString();
    const type = currentPosition.type;
    const src = flatItemsMap.get(activeId);
    const tgt = flatItemsMap.get(currentPosition.id);

    if (!src || !tgt || src.id === tgt.id) {
      resetDrag();
      return;
    }

    // Safety check for cycles & depth
    if (type === "child") {
      if (
        isDescendant(items, activeId, tgt.id) ||
        getDepth(items, tgt.id) >= MAX_DEPTH - 1
      ) {
        resetDrag();
        return;
      }
    }

    // Build a new flat structure without the source
    const newFlat = flattenedTree.filter((f) => f.id !== src.id);
    const overIndex = newFlat.findIndex((f) => f.id === tgt.id);

    let moveDescription = "";
    let insertIndex = overIndex;
    let newParentId = tgt.parentId;
    let action: CategoryAction["action"] = "ORDER_CHANGED";

    switch (type) {
      case "before":
        moveDescription = `Moved "${src.name}" before "${tgt.name}"`;
        newParentId = tgt.parentId;
        break;

      case "after":
        insertIndex = overIndex + 1;
        moveDescription = `Moved "${src.name}" after "${tgt.name}"`;
        newParentId = tgt.parentId;
        break;

      case "child":
        // Place as last child
        const lastChildIndex = newFlat.findIndex(
          (f, i) =>
            f.parentId === tgt.id &&
            (i === newFlat.length - 1 || newFlat[i + 1].parentId !== tgt.id)
        );
        insertIndex = lastChildIndex === -1 ? overIndex + 1 : lastChildIndex + 1;
        newParentId = tgt.id;
        moveDescription = `Made "${src.name}" a child of "${tgt.name}"`;
        action = "SUBCATEGORY_MOVED";
        break;

      case "root":
        newParentId = undefined;
        const rootItems = newFlat.filter((x) => !x.parentId);
        const lastRootIndex =
          rootItems.length > 0
            ? newFlat.findIndex(
                (x) => x.id === rootItems[rootItems.length - 1].id
              )
            : -1;
        insertIndex = lastRootIndex + 1;
        moveDescription = `Moved "${src.name}" to root level`;
        break;
    }

    // Insert updated item
    const updatedSrc = { ...src, parentId: newParentId };
    newFlat.splice(insertIndex, 0, updatedSrc);

    // Rebuild and update
    const newTree = buildTree(newFlat);
    setItems(newTree);
    saveCategories(newTree);

    const previousParent = src.parentId ? flatItemsMap.get(src.parentId) : undefined;
    const newParent = newParentId ? flatItemsMap.get(newParentId) : undefined;

    addToHistory({
      action,
      details: {
        message: moveDescription,
        affectedCategories: {
          target: {
            id: src.id,
            name: src.name,
            path: src.parentId ? `/${src.name.toLowerCase()}` : undefined
          },
          ...(previousParent && {
            previousParent: {
              id: previousParent.id,
              name: previousParent.name
            }
          }),
          ...(newParent && {
            newParent: {
              id: newParent.id,
              name: newParent.name
            }
          })
        }
      },
      category: {
        id: src.id,
        name: src.name,
        path: src.parentId ? `/${src.name.toLowerCase()}` : undefined,
        metadata: {
          updatedAt: new Date().toISOString(),
          status: "active"
        }
      },
      changes: {
        previousState: {
          parentId: src.parentId,
          position: overIndex,
          path: previousParent ? `/${previousParent.name.toLowerCase()}/${src.name.toLowerCase()}` : undefined
        },
        newState: {
          parentId: newParentId,
          position: insertIndex,
          path: newParent ? `/${newParent.name.toLowerCase()}/${src.name.toLowerCase()}` : undefined
        }
      }
    });
    resetDrag();
  }

  function resetDrag() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
  }

  /** Count subcategories recursively */
  const countSubcategories = useCallback((items: TreeItem[]): number => {
    return items.reduce((count, item) => {
      return count + item.children.length + countSubcategories(item.children);
    }, 0);
  }, []);

  /** Handlers for create, rename, delete */
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCat: TreeItem = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      children: [],
      parentId: undefined,
    };

    const updated = [...items, newCat];
    setItems(updated);
    saveCategories(updated);
    setNewCategoryName("");
    addToHistory({
      action: "CATEGORY_CREATED",
      details: {
        message: `Created category "${newCat.name}"`,
        affectedCategories: {
          target: {
            id: newCat.id,
            name: newCat.name,
            path: `/${newCat.name.toLowerCase()}`
          }
        }
      },
      category: {
        id: newCat.id,
        name: newCat.name,
        path: `/${newCat.name.toLowerCase()}`,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active"
        }
      }
    });
  };

  const handleDelete = useCallback(
    async (id: string) => {
      const itemToDelete = flatItemsMap.get(id);
      if (!itemToDelete) return;

      try {
        // Gather all children for deletion
        const childrenIds = new Set<string>();
        const getAllChildren = (parentId: string) => {
          flattenedTree.forEach((child) => {
            if (child.parentId === parentId) {
              childrenIds.add(child.id);
              getAllChildren(child.id);
            }
          });
        };
        getAllChildren(id);
        childrenIds.add(id);

        const newFlat = flattenedTree.filter((x) => !childrenIds.has(x.id));
        const newTree = buildTree(newFlat);
        setItems(newTree);

        // Persist changes
        await saveCategories(newTree);
        addToHistory({
          action: childrenIds.size > 1 ? "SUBCATEGORY_REMOVED" : "CATEGORY_REMOVED",
          details: {
            message: `${childrenIds.size > 1 ? 'Category and subcategories' : 'Category'} removed: "${itemToDelete.name}"`,
            affectedCategories: {
              target: {
                id: itemToDelete.id,
                name: itemToDelete.name,
                path: itemToDelete.parentId ? `/${itemToDelete.name.toLowerCase()}` : undefined
              }
            }
          },
          category: {
            id: itemToDelete.id,
            name: itemToDelete.name,
            path: itemToDelete.parentId ? `/${itemToDelete.name.toLowerCase()}` : undefined,
            metadata: {
              createdAt: itemToDelete.metadata?.createdAt || new Date().toISOString(), // Preserve original createdAt if it exists
              updatedAt: new Date().toISOString(),
              deletedAt: new Date().toISOString(),
              status: "inactive"
            }
          },
          changes: {
            previousState: {
              parentId: itemToDelete.parentId || undefined,
              status: "active"
            },
            newState: {
              status: "inactive"
            }
          }
        });
      } catch (err) {
        console.error("Failed to delete category:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete category. Please try again.",
        });
        // Reload categories from server to ensure UI consistency
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setItems(data.categories || []);
        }
      }
    },
    [flatItemsMap, flattenedTree, buildTree, saveCategories, addToHistory, toast]
  );

  return (
    <div className={cn("flex gap-6", className)}>
      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Header & Add New Category */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Categories</h2>
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
            {items.map((item) => (
              <CategoryTreeItem
                key={item.id}
                item={item}
                depth={0}
                activeId={activeId}
                overId={overId}
                currentPosition={currentPosition}
                onDelete={handleDelete}
                onRename={async (id: string, newName: string) => {
                  const oldItem = items.find((x) => x.id === id);
                  if (!oldItem) return;

                  const newArr = items.map((x) =>
                    x.id === id ? { ...x, name: newName } : x
                  );
                  setItems(newArr);

                  await saveCategories(newArr);
                  addToHistory({
                    action: "CATEGORY_RENAMED",
                    details: {
                      message: `Renamed "${oldItem.name}" to "${newName}"`,
                      affectedCategories: {
                        target: {
                          id: oldItem.id,
                          name: newName,
                          path: oldItem.parentId ? `/${newName.toLowerCase()}` : undefined
                        }
                      }
                    },
                    category: {
                      id: oldItem.id,
                      name: newName,
                      path: oldItem.parentId ? `/${newName.toLowerCase()}` : undefined,
                      metadata: {
                        updatedAt: new Date().toISOString(),
                        status: "active"
                      }
                    },
                    changes: {
                      previousState: {
                        path: oldItem.parentId ? `/${oldItem.name.toLowerCase()}` : undefined
                      },
                      newState: {
                        path: oldItem.parentId ? `/${newName.toLowerCase()}` : undefined
                      }
                    }
                  });
                }}
              />
            ))}
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

      {/* Sidebar */}
      <CategorySidebar
        items={items}
        actionHistory={actionHistory}
        isHistoryExpanded={isHistoryExpanded}
        onHistoryExpandToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
        countSubcategories={countSubcategories}
      />
    </div>
  );
}

/**
 * Main Page Component
 */
export default function CategoriesPage() {
  return (
    <div className="min-h-screen">
      <CategoryTree />
    </div>
  );
}