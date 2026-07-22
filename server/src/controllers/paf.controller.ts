import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

const DEPT = 'ICT'
const getYear = () => new Date().getFullYear().toString().slice(2)

// ─── Reset counter to match actual active form count ──────────────────────────
const syncCounter = async (year: string) => {
  const activeCount = await prisma.pafForm.count({
    where: { pafNo: { startsWith: `${DEPT}-${year}-` } },
  })
  await prisma.pafCounter.upsert({
    where: { dept_year: { dept: DEPT, year } },
    update: { counter: activeCount },
    create: { dept: DEPT, year, counter: activeCount },
  })
}

// ─── Get next PAF number ──────────────────────────────────────────────────────
export const getNextPafNo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = getYear()

    // Always sync counter with actual DB state
    await syncCounter(year)

    const counter = await prisma.pafCounter.findUnique({
      where: { dept_year: { dept: DEPT, year } },
    })
    const next = (counter?.counter ?? 0) + 1
    const pafNo = `${DEPT}-${year}-${String(next).padStart(3, '0')}`
    res.json({ success: true, data: { pafNo } })
  } catch (error) {
    console.error('GetNextPafNo error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get all PAF forms ────────────────────────────────────────────────────────
export const getForms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forms = await prisma.pafForm.findMany({
      orderBy: { createdAt: 'asc' },
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
    const form = await prisma.pafForm.findUnique({
      where: { id },
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

// ─── Create PAF form ──────────────────────────────────────────────────────────
export const createForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { employeeName, contactNo, address, date, position, deptBranch, items } = req.body

    if (!employeeName?.trim()) {
      res.status(400).json({ success: false, error: 'Employee name is required' })
      return
    }

    const year = getYear()

    // Sync counter before generating number
    await syncCounter(year)

    const counter = await prisma.pafCounter.upsert({
      where: { dept_year: { dept: DEPT, year } },
      update: { counter: { increment: 1 } },
      create: { dept: DEPT, year, counter: 1 },
    })

    const pafNo = `${DEPT}-${year}-${String(counter.counter).padStart(3, '0')}`

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
      res.status(400).json({ success: false, error: 'PAF number conflict — please try again' })
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

    const currentForm = await prisma.pafForm.findUnique({ where: { id } })
    if (!currentForm) {
      res.status(404).json({ success: false, error: 'Form not found' })
      return
    }

    // Check pafNo conflict only if it changed
    if (pafNo && pafNo !== currentForm.pafNo) {
      const conflict = await prisma.pafForm.findUnique({ where: { pafNo } })
      if (conflict) {
        res.status(400).json({ success: false, error: `PAF number ${pafNo} already exists` })
        return
      }
    }

    await prisma.pafItem.deleteMany({ where: { formId: id } })

    const form = await prisma.pafForm.update({
      where: { id },
      data: {
        pafNo: pafNo ?? currentForm.pafNo,
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

// ─── Hard delete PAF form ─────────────────────────────────────────────────────
export const deleteForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const year = getYear()

    const form = await prisma.pafForm.findUnique({ where: { id } })
    if (!form) {
      res.status(404).json({ success: false, error: 'Form not found' })
      return
    }

    // Hard delete items first, then form
    await prisma.pafItem.deleteMany({ where: { formId: id } })
    await prisma.pafForm.delete({ where: { id } })

    // Sync counter to reflect actual remaining count
    await syncCounter(year)

    res.json({ success: true, data: { message: `Form ${form.pafNo} deleted` } })
  } catch (error) {
    console.error('DeleteForm error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}