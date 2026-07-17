import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

const DEPT = 'ICT'

// ─── Get next PAF number (peek without incrementing) ──────────────────────────
export const getNextPafNo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = new Date().getFullYear().toString().slice(2)
    const counter = await prisma.pafCounter.findUnique({
      where: { dept_year: { dept: DEPT, year } },
    })
    const next = (counter?.counter ?? 0) + 1
    const pafNo = `${DEPT}-${year}-${String(next).padStart(3, '0')}`
    res.json({ success: true, data: { pafNo, next } })
  } catch (error) {
    console.error('GetNextPafNo error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get all PAF forms (excluding soft-deleted) ───────────────────────────────
export const getForms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forms = await prisma.pafForm.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' }, // oldest first so tabs are in order
      include: {
        user: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    })
    res.json({ success: true, data: forms })
  } catch (error) {
    console.error('GetForms error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get single PAF form ──────────────────────────────────────────────────────
export const getForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const form = await prisma.pafForm.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    })
    if (!form) {
      res.status(404).json({ success: false, error: 'Form not found' })
      return
    }
    res.json({ success: true, data: form })
  } catch (error) {
    console.error('GetForm error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Create PAF form (increments counter atomically) ─────────────────────────
export const createForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { pafNo: customPafNo, employeeName, contactNo, address, date, position, deptBranch, items } = req.body

    if (!employeeName?.trim()) {
      res.status(400).json({ success: false, error: 'Employee name is required' })
      return
    }

    const year = new Date().getFullYear().toString().slice(2)

    // If user edited the PAF no manually, use that — otherwise auto-generate
    let pafNo = customPafNo?.trim()

    if (!pafNo) {
      const counter = await prisma.pafCounter.upsert({
        where: { dept_year: { dept: DEPT, year } },
        update: { counter: { increment: 1 } },
        create: { dept: DEPT, year, counter: 1 },
      })
      pafNo = `${DEPT}-${year}-${String(counter.counter).padStart(3, '0')}`
    } else {
      // User provided a custom PAF no — still increment the counter
      // so next auto-generated one doesn't collide
      await prisma.pafCounter.upsert({
        where: { dept_year: { dept: DEPT, year } },
        update: { counter: { increment: 1 } },
        create: { dept: DEPT, year, counter: 1 },
      })
    }

    // Check for duplicate PAF number
    const existing = await prisma.pafForm.findFirst({
      where: { pafNo, deletedAt: null },
    })
    if (existing) {
      res.status(400).json({ success: false, error: `PAF number ${pafNo} already exists` })
      return
    }

    const form = await prisma.pafForm.create({
      data: {
        pafNo,
        employeeName: employeeName.trim(),
        contactNo: contactNo?.trim() ?? '',
        address: address?.trim() ?? '',
        date: date ?? new Date().toLocaleDateString(),
        position: position?.trim() ?? '',
        deptBranch: deptBranch?.trim() ?? '',
        createdBy: userId,
        items: {
          create: (items ?? []).map((item: any, index: number) => ({
            particulars: item.particulars ?? '',
            assetTag: item.assetTag ?? '',
            brand: item.brand ?? '',
            modelPartNo: item.modelPartNo ?? '',
            serialImeiNo: item.serialImeiNo ?? '',
            order: index,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    })

    res.status(201).json({ success: true, data: form })
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'PAF number already exists' })
      return
    }
    console.error('CreateForm error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Update PAF form ──────────────────────────────────────────────────────────
export const updateForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { pafNo, employeeName, contactNo, address, date, position, deptBranch, items } = req.body

    if (!employeeName?.trim()) {
      res.status(400).json({ success: false, error: 'Employee name is required' })
      return
    }

    // Check if PAF no is being changed to one that already exists
    if (pafNo) {
      const existing = await prisma.pafForm.findFirst({
        where: { pafNo, deletedAt: null, id: { not: id } },
      })
      if (existing) {
        res.status(400).json({ success: false, error: `PAF number ${pafNo} already exists` })
        return
      }
    }

    // Delete existing items and recreate
    await prisma.pafItem.deleteMany({ where: { formId: id } })

    const form = await prisma.pafForm.update({
      where: { id },
      data: {
        ...(pafNo && { pafNo }),
        employeeName: employeeName.trim(),
        contactNo: contactNo?.trim() ?? '',
        address: address?.trim() ?? '',
        date: date ?? '',
        position: position?.trim() ?? '',
        deptBranch: deptBranch?.trim() ?? '',
        items: {
          create: (items ?? []).map((item: any, index: number) => ({
            particulars: item.particulars ?? '',
            assetTag: item.assetTag ?? '',
            brand: item.brand ?? '',
            modelPartNo: item.modelPartNo ?? '',
            serialImeiNo: item.serialImeiNo ?? '',
            order: index,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    })

    res.json({ success: true, data: form })
  } catch (error) {
    console.error('UpdateForm error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Soft delete PAF form ─────────────────────────────────────────────────────
export const deleteForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const form = await prisma.pafForm.findFirst({
      where: { id, deletedAt: null },
    })

    if (!form) {
      res.status(404).json({ success: false, error: 'Form not found' })
      return
    }

    // Soft delete — keeps the PAF number in records, never reuses it
    await prisma.pafForm.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    res.json({ success: true, data: { message: `Form ${form.pafNo} deleted` } })
  } catch (error) {
    console.error('DeleteForm error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}