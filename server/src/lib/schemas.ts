import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email address').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff', 'viewer']),
})

export const createTableSchema = z.object({
  name: z.string().min(1, 'Table name is required').max(100).trim(),
  fields: z.array(z.object({
    fieldName: z.string().min(1, 'Field name is required').max(100).trim(),
    fieldType: z.enum(['text', 'number', 'date', 'boolean', 'dropdown']),
    required: z.boolean().optional().default(false),
    isStockField: z.boolean().optional().default(false),
    lowStockThreshold: z.number().optional().nullable(),
    options: z.array(z.object({
      label: z.string().min(1),
      color: z.string(),
    })).optional().nullable(),
  })).min(1, 'At least one field is required'),
})

export const createRowSchema = z.object({
  data: z.record(z.unknown()),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})