// ─── Roles ────────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'staff' | 'viewer'

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

// ─── Field Types ──────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'dropdown'

export interface DropdownOption {
  label: string
  color: string
}

// ─── Field Definition ─────────────────────────────────────────────────────────
export interface FieldDefinition {
  id: string
  tableId: string
  fieldName: string
  fieldType: FieldType
  required: boolean
  isUnique: boolean
  isStockField: boolean
  lowStockThreshold: number | null
  options: DropdownOption[] | null
  order: number
}

// ─── Inventory Table ──────────────────────────────────────────────────────────
export interface InventoryTable {
  id: string
  name: string
  createdBy: string
  createdAt: string
  fields: FieldDefinition[]
}

// ─── Inventory Row ────────────────────────────────────────────────────────────
export interface InventoryRow {
  id: string
  tableId: string
  data: Record<string, unknown> 
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Stock Movement ───────────────────────────────────────────────────────────
export type MovementType = 'restock' | 'deduction' | 'adjustment'

export interface StockMovement {
  id: string
  tableId: string
  rowId: string
  fieldName: string
  type: MovementType
  delta: number                  
  note: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy: string
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
