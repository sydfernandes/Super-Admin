export type FieldItemType = "text" | "number" | "boolean" | "date" | "select" | "multiselect" | "url" | "timestamp" | "email" | "image" | "currency" | "phone" | "json" | "markdown" | "color";

export interface BaseFieldItem {
  id: string;
  name: string;
  type: FieldItemType;
  required: boolean;
  parentId: string | null;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

export interface TreeItem extends BaseFieldItem {
  children: TreeItem[];
}

export interface FieldAction {
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
  field: BaseFieldItem;
  changes?: {
    previousState?: {
      type?: FieldItemType;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
    newState?: {
      type?: FieldItemType;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
  };
} 