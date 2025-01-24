"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Pencil, Trash2, GripVertical, Plus, CirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";

/** ---------------------------------------------------------------------------------
 * 1. Data Types
 * --------------------------------------------------------------------------------- */
export interface TreeItem {
  id: string;
  name: string;
  parentId: string | null;
  children: TreeItem[];
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

/** ---------------------------------------------------------------------------------
 * 2. Constants
 * --------------------------------------------------------------------------------- */
const INDENT_SIZE = 24;
const UNPARENT_THRESHOLD = -20;
const CHILD_THRESHOLD = 20;
const MAX_DEPTH = 5;
const GAP_SIZE = 8; // 0.5rem (gap-2) in pixels

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
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
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

  // Ghost lines
  const isOver = overId === item.id;
  const showGhostBefore = isOver && currentPosition?.type === "before";
  const showGhostAfter = isOver && currentPosition?.type === "after";
  const showGhostChild = isOver && currentPosition?.type === "child";
  const showGhostRoot = isOver && currentPosition?.type === "root";

  // Constants for positioning
  const ROW_HEIGHT = 48; // h-12 equals 48px

  // Helper for line positioning
  const getLineStyle = (indentLevel: number) => ({
    left: `${indentLevel * INDENT_SIZE}px`,
    right: 0,
    zIndex: 10, // Ensure lines appear above items
  });

  // Return empty space if dragging this item
  if (isDragging) {
    return null;
  }

  return (
    <div className="relative">
      {/* Root line */}
      {showGhostRoot && (
        <div 
          className="absolute left-0 right-0 pointer-events-none" 
          style={{ 
            top: `${-GAP_SIZE/2}px`,
            zIndex: 10
          }}
        >
          <div className="relative h-[1px] bg-primary px-4">
            <div className="absolute left-0 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            <div className="absolute right-0 top-1/2 w-2 h-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        </div>
      )}

      {/* Before line */}
      {showGhostBefore && (
        <div
          className="absolute pointer-events-none"
          style={{ 
            ...getLineStyle(depth), 
            top: `${-GAP_SIZE/2}px`
          }}
        >
          <div className="relative h-[1px] bg-primary px-4">
            <div className="absolute left-0 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            <div className="absolute right-0 top-1/2 w-2 h-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        </div>
      )}

      {/* Actual row */}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative flex items-center gap-2 h-12 px-4 rounded-lg border bg-background",
          activeId === item.id && "opacity-50"
        )}
      >
        <button
          className="touch-none p-1 opacity-60 hover:opacity-100"
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

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Child line */}
        {showGhostChild && (
          <div
            className="absolute pointer-events-none"
            style={{
              ...getLineStyle(depth + 1),
              top: `${item.children.length ? -GAP_SIZE/2 : ROW_HEIGHT}px`
            }}
          >
            <div className="relative h-[1px] bg-primary px-4">
              <div className="absolute left-0 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
              <div className="absolute right-0 top-1/2 w-2 h-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            </div>
          </div>
        )}
      </div>

      {/* After line */}
      {showGhostAfter && !showGhostChild && (
        <div
          className="absolute pointer-events-none"
          style={{ 
            ...getLineStyle(depth), 
            top: `${ROW_HEIGHT + GAP_SIZE/2}px`
          }}
        >
          <div className="relative h-[1px] bg-primary px-4">
            <div className="absolute left-0 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
            <div className="absolute right-0 top-1/2 w-2 h-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        </div>
      )}

      {/* Render children with the same gap */}
      {item.children.length > 0 && (
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
  const [currentPosition, setCurrentPosition] = useState<DragIntention | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  /** Load categories on mount */
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setItems(data.categories || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  /** Save categories whenever they change */
  const saveCategories = useCallback(async (newItems: TreeItem[]) => {
    try {
      await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: newItems }),
      });
    } catch (error) {
      console.error("Failed to save categories:", error);
    }
  }, []);

  /** Flatten & rebuild approach */
  const flattenTree = useCallback((list: TreeItem[], parentId: string | null = null): TreeItem[] => {
    return list.reduce<TreeItem[]>((acc, item) => {
      const copy = { ...item, parentId };
      return [...acc, copy, ...flattenTree(item.children, item.id)];
    }, []);
  }, []);

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

  /** Depth helper */
  const getDepth = useCallback(function getDepth(
    list: TreeItem[],
    id: string,
    depth = 0
  ): number {
    for (const it of list) {
      if (it.id === id) return depth;
      const childDepth = getDepth(it.children, id, depth + 1);
      if (childDepth !== -1) return childDepth;
    }
    return -1;
  },
  []);

  /** Check for cycles */
  const isDescendant = useCallback(function isDescendant(
    items: TreeItem[],
    sourceId: string,
    targetId: string
  ): boolean {
    function dfs(children: TreeItem[]): boolean {
      for (const c of children) {
        if (c.id === targetId) return true;
        if (dfs(c.children)) return true;
      }
      return false;
    }
    const source = items.find((x) => x.id === sourceId);
    if (!source) return false;
    return dfs(source.children);
  },
  []);

  /** Handlers */
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id.toString());
  }

  function handleDragMove({ delta, over }: DragMoveEvent) {
    setOffsetLeft(delta.x);
    if (over) {
      setOverId(over.id.toString());
    }
  }

  function handleDragOver({ over, active }: DragOverEvent) {
    if (!over) {
      setCurrentPosition(null);
      return;
    }
    const overId = over.id.toString();
    const activeId = active.id.toString();

    const flat = flattenTree(items);
    const src = flat.find((f) => f.id === activeId);
    const tgt = flat.find((f) => f.id === overId);
    if (!src || !tgt || src.id === tgt.id) {
      setCurrentPosition(null);
      return;
    }

    // no cycles
    if (isDescendant(items, activeId, overId)) {
      setCurrentPosition(null);
      return;
    }

    const overDepth = getDepth(items, overId);

    // measure pointer in hovered item
    const overRect = over.rect;
    const pointerY = active.rect.current.translated?.top || 0;
    const offsetY = pointerY - overRect.top;
    const halfHeight = overRect.height / 2;

    // Check horizontal movement for nesting/unnesting
    if (offsetLeft > CHILD_THRESHOLD && overDepth < MAX_DEPTH - 1) {
      // Moving right - make it a child
      setCurrentPosition({ type: "child", id: overId });
      return;
    }
    
    if (offsetLeft < UNPARENT_THRESHOLD && src.parentId !== null) {
      // Moving left - promote up a level
      setCurrentPosition({ type: "root", id: overId });
      return;
    }
    
    // Default before/after behavior based on vertical position
    if (offsetY < halfHeight) {
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
    const overId = over.id.toString();
    const type = currentPosition.type;

    const flat = flattenTree(items);
    const src = flat.find((x) => x.id === activeId);
    const tgt = flat.find((x) => x.id === overId);
    if (!src || !tgt || src.id === tgt.id) {
      resetDrag();
      return;
    }

    // child + cycle check
    if (type === "child" && isDescendant(items, activeId, overId)) {
      resetDrag();
      return;
    }

    // remove src
    const newFlat = flat.filter((f) => f.id !== src.id);
    const overIndex = newFlat.findIndex((f) => f.id === tgt.id);

    switch (type) {
      case "before":
        newFlat.splice(overIndex, 0, { ...src, parentId: tgt.parentId });
        break;
      case "after":
        newFlat.splice(overIndex + 1, 0, { ...src, parentId: tgt.parentId });
        break;
      case "child": {
        const lastChildIndex = newFlat.findIndex(
          (f, i) =>
            f.parentId === tgt.id &&
            (i === newFlat.length - 1 || newFlat[i + 1].parentId !== tgt.id)
        );
        const insertIndex = lastChildIndex === -1 ? overIndex + 1 : lastChildIndex + 1;
        newFlat.splice(insertIndex, 0, { ...src, parentId: tgt.id });
        break;
      }
      case "root": {
        // become root
        if (!tgt.parentId) {
          // if hovered item is root, decide top/bottom by pointer
          const pointerY = active.rect.current.translated?.top || 0;
          const offsetY = pointerY - over.rect.top;
          const halfHeight = over.rect.height / 2;
          if (offsetY < halfHeight) {
            newFlat.splice(overIndex, 0, { ...src, parentId: null });
          } else {
            newFlat.splice(overIndex + 1, 0, { ...src, parentId: null });
          }
        } else {
          const rootItems = newFlat.filter((r) => !r.parentId);
          const lastRootIndex =
            rootItems.length > 0
              ? newFlat.findIndex((r) => r.id === rootItems[rootItems.length - 1].id)
              : -1;
          newFlat.splice(lastRootIndex + 1, 0, { ...src, parentId: null });
        }
        break;
      }
    }

    const newTree = buildTree(newFlat);
    setItems(newTree);
    saveCategories(newTree);
    resetDrag();
  }

  function resetDrag() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    
    const newCat: TreeItem = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      children: [],
      parentId: null,
    };
    const updated = [...items, newCat];
    setItems(updated);
    saveCategories(updated);
    setNewCategoryName(""); // Reset input
  }

  return (
    <div className={cn("p-4", className)}>
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
          <Button
            variant="default"
            size="default"
            onClick={handleAddCategory}
          >
            <CirclePlus className="h-5 w-5" />
          </Button>
        </div>
      </div>

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
              onDelete={async (id: string) => {
                const newArr = items.filter((x) => x.id !== id);
                setItems(newArr);
                await saveCategories(newArr);
              }}
              onRename={async (id: string, newName: string) => {
                const newArr = items.map((x) =>
                  x.id === id ? { ...x, name: newName } : x
                );
                setItems(newArr);
                await saveCategories(newArr);
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={defaultDropAnimation}>
          {activeId && (
            <div className="bg-background border rounded-md p-2 opacity-80">
              {items.find((it) => it.id === activeId)?.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 