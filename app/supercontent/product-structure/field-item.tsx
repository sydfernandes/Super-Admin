'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeItem, FieldItemType } from "./types";

export interface ProductFieldItemProps {
  item: TreeItem;
  depth: number;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onTypeChange: (id: string, newType: FieldItemType) => Promise<void>;
  onRequiredChange: (id: string, required: boolean) => Promise<void>;
}

export function ProductFieldItem({
  item,
  depth,
  onDelete,
  onRename,
  onTypeChange,
  onRequiredChange,
}: ProductFieldItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);

  const handleRename = async () => {
    if (editedName.trim() && editedName !== item.name) {
      await onRename(item.id, editedName.trim());
    }
    setIsEditing(false);
  };

  const fieldTypes: FieldItemType[] = [
    "text",
    "number",
    "boolean",
    "date",
    "select",
    "multiselect",
    "url",
    "timestamp",
    "email",
    "image",
    "currency",
    "phone",
    "json",
    "markdown",
    "color"
  ];

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border bg-card p-2 text-card-foreground shadow-sm",
          "hover:border-primary/20"
        )}
        style={{ marginLeft: `${depth * 2}rem` }}
      >
        {item.children.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        <div className="flex flex-1 items-center gap-4">
          {isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              onBlur={handleRename}
              className="h-8 w-[200px]"
              autoFocus
            />
          ) : (
            <div className="flex-1 font-medium">
              {item.name}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Select
              value={item.type}
              onValueChange={(value) => onTypeChange(item.id, value as FieldItemType)}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Required</span>
              <Switch
                checked={item.required}
                onCheckedChange={(checked) => onRequiredChange(item.id, checked)}
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && item.children.length > 0 && (
        <div className="space-y-2">
          {item.children.map((child) => (
            <ProductFieldItem
              key={child.id}
              item={child}
              depth={depth + 1}
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