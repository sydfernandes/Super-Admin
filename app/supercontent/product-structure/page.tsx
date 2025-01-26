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

/** ---------------------------------------------------------------------------------
 * 1. Data Types
 * --------------------------------------------------------------------------------- */
interface FieldItem {
  id: string;
  name: string;
  type: "text" | "number" | "boolean" | "date" | "select" | "multiselect" | "url" | "timestamp" | "email" | "image" | "currency" | "phone" | "json" | "markdown" | "color";
  required: boolean;
  parentId: string | undefined;
  children: FieldItem[];
  options?: string[];
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

interface FieldAction {
  id: string;
  timestamp: string;
  action: "FIELD_CREATED" | "FIELD_UPDATED" | "FIELD_DELETED" | "FIELD_MOVED" | "FIELD_REQUIRED_CHANGED" | "FIELD_TYPE_CHANGED";
  details: {
    message: string;
    affectedFields: {
      target: {
        id: string;
        name: string;
      };
    };
  };
  user: {
    id: string;
    name: string;
  };
  field: {
    id: string;
    name: string;
    type: string;
    required: boolean;
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      deletedAt?: string;
      status?: "active" | "inactive";
    };
  };
  changes?: {
    previousState?: {
      type?: string;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
    newState?: {
      type?: string;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
  };
}

/** Props for the top-level ProductStructure container */
interface ProductStructureProps {
  className?: string;
  onDataUpdate?: (data: { items: FieldItem[] }) => void;
}

/** Props for each item (node) in the tree */
interface ProductFieldItemProps {
  item: FieldItem;
  depth: number;
  activeId: string | null;
  overId: string | null;
  currentPosition: DragIntention | null;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onTypeChange: (id: string, newType: FieldItem["type"]) => Promise<void>;
  onRequiredChange: (id: string, required: boolean) => Promise<void>;
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
          onValueChange={(value) => onTypeChange(item.id, value as FieldItem["type"])}
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
            <ProductFieldItem
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
  const [items, setItems] = useState<FieldItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<DragIntention | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const { toast } = useToast();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const flattenTree = useCallback(
    (list: FieldItem[], parentId: string | undefined = undefined): FieldItem[] => {
      return list.reduce<FieldItem[]>((acc, item) => {
        const copy = { ...item, parentId };
        return [...acc, copy, ...flattenTree(item.children, item.id)];
      }, []);
    },
    []
  );

  const buildTree = useCallback((flat: FieldItem[]): FieldItem[] => {
    const map = new Map<string, FieldItem>();
    for (const f of flat) {
      map.set(f.id, { ...f, children: [] });
    }
    const result: FieldItem[] = [];
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

  const flattenedTree = useMemo(() => flattenTree(items), [items, flattenTree]);
  const flatItemsMap = useMemo(() => {
    const map = new Map<string, FieldItem>();
    flattenedTree.forEach((item) => map.set(item.id, item));
    return map;
  }, [flattenedTree]);

  const getDepth = useCallback(
    (list: FieldItem[], id: string): number => {
      if (!list.length) return -1;
      const queue: Array<{ items: FieldItem[]; depth: number }> = [
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

  const isDescendant = useCallback(
    (items: FieldItem[], sourceId: string, targetId: string): boolean => {
      const source = items.find((x) => x.id === sourceId);
      if (!source) return false;

      function hasDescendant(tid: string, children: FieldItem[]): boolean {
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

  const saveFields = useCallback(
    async (newItems: FieldItem[]) => {
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
          description:
            "Failed to save fields. Your changes may not be persisted.",
        });
      }
    },
    [toast]
  );

  const addToHistory = useCallback(
    async (action: Omit<FieldAction, "id" | "timestamp" | "user">) => {
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
    },
    [toast]
  );

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

    if (isDescendant(items, activeId, overId)) {
      setCurrentPosition(null);
      return;
    }

    const overDepth = getDepth(items, overId);

    const overRect = over.rect;
    const activeRect = active.rect.current?.translated;
    if (!activeRect || !overRect.height) {
      setCurrentPosition(null);
      return;
    }

    const pointerY = activeRect.top;
    const offsetY = Math.max(0, Math.min(pointerY - overRect.top, overRect.height));
    const relativeY = offsetY / overRect.height;

    if (offsetLeft < UNPARENT_THRESHOLD && src.parentId) {
      if (!tgt.parentId) {
        if (relativeY < 0.5) {
          setCurrentPosition({ type: "before", id: overId });
        } else {
          setCurrentPosition({ type: "after", id: overId });
        }
      } else {
        setCurrentPosition({ type: "root", id: overId });
      }
      return;
    }

    if (offsetLeft > CHILD_THRESHOLD && overDepth < MAX_DEPTH - 1) {
      setCurrentPosition({ type: "child", id: overId });
      return;
    }

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

    if (type === "child") {
      if (
        isDescendant(items, activeId, tgt.id) ||
        getDepth(items, tgt.id) >= MAX_DEPTH - 1
      ) {
        resetDrag();
        return;
      }
    }

    const newFlat = flattenedTree.filter((f) => f.id !== src.id);
    const overIndex = newFlat.findIndex((f) => f.id === tgt.id);

    let insertIndex = overIndex;
    let newParentId = tgt.parentId;

    switch (type) {
      case "before":
        newParentId = tgt.parentId;
        break;

      case "after":
        insertIndex = overIndex + 1;
        newParentId = tgt.parentId;
        break;

      case "child":
        const lastChildIndex = newFlat.findIndex(
          (f, i) =>
            f.parentId === tgt.id &&
            (i === newFlat.length - 1 || newFlat[i + 1].parentId !== tgt.id)
        );
        insertIndex = lastChildIndex === -1 ? overIndex + 1 : lastChildIndex + 1;
        newParentId = tgt.id;
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
        break;
    }

    const updatedSrc = { ...src, parentId: newParentId };
    newFlat.splice(insertIndex, 0, updatedSrc);

    const newTree = buildTree(newFlat);
    setItems(newTree);
    saveFields(newTree);
    resetDrag();
  }

  function resetDrag() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
  }

  const handleAddField = () => {
    if (!newFieldName.trim()) return;

    const newField: FieldItem = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: "text",
      required: false,
      children: [],
      parentId: undefined,
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
      field: {
        id: newField.id,
        name: newField.name,
        type: newField.type,
        required: newField.required,
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
        await saveFields(newTree);
      } catch (err) {
        console.error("Failed to delete field:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete field. Please try again.",
        });
        const response = await fetch("/api/product-structure");
        if (response.ok) {
          const data = await response.json();
          setItems(data.fields || []);
        }
      }
    },
    [flatItemsMap, flattenedTree, buildTree, saveFields, toast]
  );

  useEffect(() => {
    onDataUpdate?.({ items });
  }, [items, onDataUpdate]);

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
              <ProductFieldItem
                key={item.id}
                item={item}
                depth={0}
                activeId={activeId}
                overId={overId}
                currentPosition={currentPosition}
                onDelete={handleDelete}
                onRename={async (id: string, newName: string) => {
                  const newArr = items.map((x) =>
                    x.id === id ? { ...x, name: newName } : x
                  );
                  setItems(newArr);
                  await saveFields(newArr);
                }}
                onTypeChange={async (id: string, newType: FieldItem["type"]) => {
                  const newArr = items.map((x) =>
                    x.id === id ? { ...x, type: newType } : x
                  );
                  setItems(newArr);
                  await saveFields(newArr);
                }}
                onRequiredChange={async (id: string, required: boolean) => {
                  const oldItem = items.find(x => x.id === id);
                  if (!oldItem) return;

                  const newArr = items.map((x) =>
                    x.id === id ? { ...x, required } : x
                  );
                  setItems(newArr);
                  await saveFields(newArr);

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
                    field: {
                      id: oldItem.id,
                      name: oldItem.name,
                      type: oldItem.type,
                      required,
                      metadata: {
                        updatedAt: new Date().toISOString(),
                        status: "active"
                      }
                    },
                    changes: {
                      previousState: {
                        required: oldItem.required
                      },
                      newState: {
                        required
                      }
                    }
                  });
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
    </div>
  );
}

/**
 * Main Page Component
 */
export default function ProductStructurePage() {
  const [items, setItems] = useState<FieldItem[]>([])
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