import { useEffect, useRef, useState, useCallback } from 'react'
import { tablesApi, rowsApi, pafApi } from '../lib/api'
import { Printer, ImageIcon, X, Check, Save, Plus, Trash2, Eye } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface InventoryTable {
  id: string
  name: string
  fields: { id: string; fieldName: string; fieldType: string; order: number }[]
}

interface InventoryRow {
  id: string
  data: Record<string, any>
}

interface PafItem {
  particulars: string
  assetTag: string
  brand: string
  modelPartNo: string
  serialImeiNo: string
}

interface FormData {
  pafNo: string
  employeeName: string
  contactNo: string
  address: string
  date: string
  position: string
  deptBranch: string
  items: PafItem[]
}

interface SavedForm {
  id: string
  pafNo: string
  employeeName: string
  contactNo: string
  address: string
  date: string
  position: string
  deptBranch: string
  createdAt: string
  user: { id: string; name: string }
  items: (PafItem & { id: string; order: number })[]
}

interface SavedLogo {
  id: string
  name: string
  dataUrl: string
}

const LOGOS_KEY = 'paf-logos'
const EMPTY_ITEM = (): PafItem => ({ particulars: '', assetTag: '', brand: '', modelPartNo: '', serialImeiNo: '' })

const emptyForm = (pafNo = ''): FormData => ({
  pafNo,
  employeeName: '',
  contactNo: '',
  address: '',
  date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
  position: '',
  deptBranch: '',
  items: [EMPTY_ITEM()],
})

export default function AccountabilityFormPage() {
  const { isStaffOrAdmin } = useAuth()
  const { showToast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tables, setTables] = useState<InventoryTable[]>([])
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [selectedTableId, setSelectedTableId] = useState('')
  const [isLoadingRows, setIsLoadingRows] = useState(false)

  const [logos, setLogos] = useState<SavedLogo[]>([])
  const [selectedLogoId, setSelectedLogoId] = useState('')
  const [showLogoPicker, setShowLogoPicker] = useState(false)

  const [savedForms, setSavedForms] = useState<SavedForm[]>([])
  const [activeFormId, setActiveFormId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavedForm | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState<FormData>(emptyForm())
  const [autoFillRowIndex, setAutoFillRowIndex] = useState<number>(0)

  // ─── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load logos
    try {
      const saved = localStorage.getItem(LOGOS_KEY)
      if (saved) {
        const parsed: SavedLogo[] = JSON.parse(saved)
        setLogos(parsed)
        if (parsed.length > 0) setSelectedLogoId(parsed[0].id)
      }
    } catch { }

    // Load tables
    tablesApi.getAll().then((res) => setTables(res.data.data)).catch(() => { })

    // Load saved forms
    fetchForms()

    // Get next PAF no
    pafApi.getNextPafNo().then((res) => {
      setForm(emptyForm(res.data.data.pafNo))
    }).catch(() => { })
  }, [])

  const fetchForms = async () => {
    try {
      const res = await pafApi.getForms()
      setSavedForms(res.data.data)
    } catch { }
  }

  // ─── Logo handlers ────────────────────────────────────────────────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo must be under 2MB', 'error')
      e.target.value = ''
      return
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      showToast('Only PNG and JPG are allowed', 'error')
      e.target.value = ''
      return
    }
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const newLogo: SavedLogo = { id: Date.now().toString(), name: file.name, dataUrl: reader.result as string }
      const updated = [...logos, newLogo]
      setLogos(updated)
      setSelectedLogoId(newLogo.id)
      localStorage.setItem(LOGOS_KEY, JSON.stringify(updated))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const deleteLogo = (id: string) => {
    const updated = logos.filter((l) => l.id !== id)
    setLogos(updated)
    localStorage.setItem(LOGOS_KEY, JSON.stringify(updated))
    if (selectedLogoId === id) setSelectedLogoId(updated[0]?.id ?? '')
  }

  const selectedLogo = logos.find((l) => l.id === selectedLogoId)

  // ─── Table/row auto-fill ──────────────────────────────────────────────────
  const handleTableChange = async (tableId: string) => {
    setSelectedTableId(tableId)
    setRows([])
    if (!tableId) return
    setIsLoadingRows(true)
    try {
      const res = await rowsApi.getAll(tableId)
      setRows(res.data.data)
    } catch { } finally { setIsLoadingRows(false) }
  }

  const handleAutoFill = (rowId: string, itemIndex: number) => {
    if (!rowId) return
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    const table = tables.find((t) => t.id === selectedTableId)
    const data = row.data

    const find = (...keys: string[]) => {
      for (const key of keys) {
        const match = Object.keys(data).find(
          (k) => k.toLowerCase().replace(/[\s_\-]/g, '') === key.toLowerCase()
        )
        if (match && data[match]) return String(data[match])
      }
      return ''
    }

    const updatedItems = [...form.items]
    updatedItems[itemIndex] = {
      particulars: table?.name ?? '',
      assetTag: find('assettag', 'asset', 'tag'),
      brand: find('brand', 'make', 'manufacturer'),
      modelPartNo: find('model', 'modelno', 'partnumber'),
      serialImeiNo: find('serial', 'serialno', 'serialnumber', 'imei', 'sn'),
    }

    // Also try to fill employee info from first row
    if (itemIndex === 0) {
      setForm((prev) => ({
        ...prev,
        items: updatedItems,
        employeeName: prev.employeeName || find('accountableuser', 'accountable', 'employee', 'name', 'assignedto', 'currentuser'),
        position: prev.position || find('position', 'designation', 'jobtitle'),
        deptBranch: prev.deptBranch || find('department', 'dept', 'branch', 'division'),
      }))
    } else {
      setForm((prev) => ({ ...prev, items: updatedItems }))
    }
  }

  // ─── Item row handlers ────────────────────────────────────────────────────
  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }))
  }

  const removeItem = (index: number) => {
    if (form.items.length === 1) return
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const updateItem = (index: number, key: keyof PafItem, value: string) => {
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [key]: value }
      return { ...prev, items }
    })
  }

  // ─── Save form ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.employeeName.trim()) { showToast('Employee name is required', 'error'); return }
    setIsSaving(true)
    try {
      if (activeFormId) {
        await pafApi.updateForm(activeFormId, form)
        showToast('Form updated successfully')
      } else {
        const res = await pafApi.createForm(form)
        setActiveFormId(res.data.data.id)
        // Get next PAF no for next new form
        await pafApi.getNextPafNo()
        showToast(`Saved as ${form.pafNo}`)
      }
      fetchForms()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Load saved form ──────────────────────────────────────────────────────
  const loadForm = (saved: SavedForm) => {
    setActiveFormId(saved.id)
    setForm({
      pafNo: saved.pafNo,
      employeeName: saved.employeeName,
      contactNo: saved.contactNo,
      address: saved.address,
      date: saved.date,
      position: saved.position,
      deptBranch: saved.deptBranch,
      items: saved.items.length > 0 ? saved.items : [EMPTY_ITEM()],
    })
    setSelectedTableId('')
    setRows([])
  }

  // ─── New form ─────────────────────────────────────────────────────────────
  const handleNewForm = async () => {
    setActiveFormId(null)
    try {
      const res = await pafApi.getNextPafNo()
      setForm(emptyForm(res.data.data.pafNo))
    } catch {
      setForm(emptyForm())
    }
    setSelectedTableId('')
    setRows([])
  }

  // ─── Delete form ──────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await pafApi.deleteForm(deleteTarget.id)
      showToast('Form deleted')
      await fetchForms()
      if (activeFormId === deleteTarget.id) {
        await handleNewForm()
      }
    } catch {
      showToast('Failed to delete', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ─── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=850,height=1100')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PAF - ${form.pafNo}</title>
          <style>
            html, body { 
              margin: 0; 
              padding: 10px; 
              box-sizing: border-box; 
            }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              font-size: 10px; 
              color: #000; 
              line-height: 1.3; 
            }
            @page { 
              size: Letter; 
              margin: 10mm; 
            }
            input { 
              border: none !important; 
              outline: none; 
              background: transparent; 
              width: 100%; 
              font-size: 9px; 
              color: #000; 
              pointer-events: none; 
            }
            button { 
              display: none !important; 
            }
            select { 
              display: none !important; 
            }
            .no-print { 
              display: none !important; 
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print(); printWindow.close() }
  }

  const update = (key: keyof Omit<FormData, 'items'>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isViewer = !isStaffOrAdmin

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-[#0f1117]">

      {/* Top Controls */}
      <div className="sticky top-0 bg-white dark:bg-[#1a1d2e] border-b border-gray-200 dark:border-[#2a2d3e] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Property Accountability Form</h1>
          {activeFormId && (
            <p className="text-xs text-gray-400 mt-0.5">
              {isViewer ? 'Viewing: ' : 'Editing: '}{form.pafNo} · by {savedForms.find((s) => s.id === activeFormId)?.user.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-fill controls — only for staff/admin */}
          {isStaffOrAdmin && (
            <>
              <select
                value={selectedTableId}
                onChange={(e) => handleTableChange(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Auto-fill from table</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              {selectedTableId && (
                <select
                  onChange={(e) => handleAutoFill(e.target.value, autoFillRowIndex)}
                  disabled={isLoadingRows}
                  className="px-2 py-1.5 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">{isLoadingRows ? 'Loading...' : 'Pick row to fill...'}</option>
                  {rows.map((row) => {
                    const selectedTable = tables.find((t) => t.id === selectedTableId)
                    const sortedFields = selectedTable
                      ? [...(selectedTable.fields ?? [])].sort((a, b) => a.order - b.order)
                      : []
                    const firstField = sortedFields[0]
                    const firstValue = firstField ? row.data[firstField.fieldName] : null
                    return (
                      <option key={row.id} value={row.id}>
                        {firstValue ? String(firstValue) : row.id.slice(0, 8)}
                      </option>
                    )
                  })}
                </select>
              )}
            </>
          )}

          <button
            onClick={() => setShowLogoPicker(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors"
          >
            <ImageIcon size={12} />
            Logo
          </button>

          {isStaffOrAdmin && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={12} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Printer size={12} />
            Print
          </button>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          ref={printRef}
          style={{
            width: '612px', minHeight: '792px', background: 'white',
            border: '1px solid #ccc', padding: '20px',
            fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', flexShrink: 0,
          }}
        >
          {/* Header */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '6px',
            }}
          >
            <tbody>
              <tr>
                {/* COMPANY LOGO */}
                <td
                  style={{
                    width: '42%',
                    padding: '4px 6px',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    onClick={() => !isViewer && setShowLogoPicker(true)}
                    style={{
                      width: '180px',
                      height: '70px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      cursor: isViewer ? 'default' : 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    {selectedLogo ? (
                      <img
                        src={selectedLogo.dataUrl}
                        alt="Company Logo"
                        style={{
                          width: '180px',
                          height: '70px',
                          objectFit: 'contain',
                          objectPosition: 'left center',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '8px',
                          color: '#999',
                          textAlign: 'center',
                          padding: '4px',
                        }}
                      >
                        {isViewer ? 'No logo' : 'Click to set logo'}
                      </span>
                    )}
                  </div>
                </td>

                {/* TITLE + PAF NUMBER */}
                <td
                  style={{
                    width: '58%',
                    padding: '4px 6px',
                    verticalAlign: 'middle',
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      lineHeight: '1.15',
                      textAlign: 'right',
                    }}
                  >
                    PROPERTY
                  </div>

                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      lineHeight: '1.15',
                      textAlign: 'right',
                    }}
                  >
                    ACCOUNTABILITY FORM
                  </div>

                  {/* PAF NUMBER */}
                  <div
                    style={{
                      marginTop: '5px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: '10px',
                      }}
                    >
                      PAF No.:
                    </span>

                    <input
                      value={form.pafNo}
                      onChange={(e) =>
                        !isViewer && update('pafNo', e.target.value)
                      }
                      readOnly={isViewer}
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '105px',
                        padding: '0',
                        margin: '0',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#e53e3e',
                        textAlign: 'right',
                        background: 'transparent',
                        cursor: isViewer ? 'default' : 'text',
                      }}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>


          {/* Employee Info */}
          <SectionHeader title="EMPLOYEE INFORMATION" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={sc}><b>NAME :</b></td>
                <td style={{ ...sc, width: '35%' }}><input value={form.employeeName} onChange={(e) => !isViewer && update('employeeName', e.target.value)} readOnly={isViewer} style={si} placeholder={isViewer ? '' : 'Full Name'} /></td>
                <td style={sc}><b>CONTACT No.:</b></td>
                <td style={sc}><input value={form.contactNo} onChange={(e) => !isViewer && update('contactNo', e.target.value)} readOnly={isViewer} style={si} /></td>
              </tr>
              <tr>
                <td style={sc}><b>ADDRESS:</b></td>
                <td style={sc}><input value={form.address} onChange={(e) => !isViewer && update('address', e.target.value)} readOnly={isViewer} style={si} /></td>
                <td style={sc}><b>DATE :</b></td>
                <td style={sc}><input value={form.date} onChange={(e) => !isViewer && update('date', e.target.value)} readOnly={isViewer} style={si} /></td>
              </tr>
              <tr>
                <td style={sc}><b>POSITION:</b></td>
                <td style={sc}><input value={form.position} onChange={(e) => !isViewer && update('position', e.target.value)} readOnly={isViewer} style={si} /></td>
                <td style={sc}><b>DEPT. / BRANCH:</b></td>
                <td style={sc}><input value={form.deptBranch} onChange={(e) => !isViewer && update('deptBranch', e.target.value)} readOnly={isViewer} style={si} /></td>
              </tr>
            </tbody>
          </table>

          {/* Property Description */}
          <SectionHeader title="PROPERTY DESCRIPTION" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['PARTICULARS', 'ASSET TAG', 'BRAND', 'MODEL/PART No.', 'SERIAL / IMEI No.'].map((h) => (
                  <th key={h} style={{ ...sc, textAlign: 'center', fontSize: '8px', fontWeight: 'bold' }}>{h}</th>
                ))}
                {isStaffOrAdmin && <th className="no-print" style={{ ...sc, width: '60px', textAlign: 'center', fontSize: '8px' }}>FILL / DEL</th>}
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, index) => (
                <tr key={index}>
                  <td style={sc}><input value={item.particulars} onChange={(e) => !isViewer && updateItem(index, 'particulars', e.target.value)} readOnly={isViewer} style={si} /></td>
                  <td style={sc}><input value={item.assetTag} onChange={(e) => !isViewer && updateItem(index, 'assetTag', e.target.value)} readOnly={isViewer} style={si} /></td>
                  <td style={sc}><input value={item.brand} onChange={(e) => !isViewer && updateItem(index, 'brand', e.target.value)} readOnly={isViewer} style={si} /></td>
                  <td style={sc}><input value={item.modelPartNo} onChange={(e) => !isViewer && updateItem(index, 'modelPartNo', e.target.value)} readOnly={isViewer} style={si} /></td>
                  <td style={sc}><input value={item.serialImeiNo} onChange={(e) => !isViewer && updateItem(index, 'serialImeiNo', e.target.value)} readOnly={isViewer} style={si} /></td>
                  {isStaffOrAdmin && (
                    <td className="no-print" style={{ ...sc, textAlign: 'center', padding: '2px' }}>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Auto-fill this row from selected table row */}
                        {selectedTableId && rows.length > 0 && (
                          <select
                            onChange={(e) => { setAutoFillRowIndex(index); handleAutoFill(e.target.value, index) }}
                            style={{ fontSize: '7px', padding: '1px', border: '1px solid #ccc', borderRadius: '2px', maxWidth: '40px' }}
                          >
                            <option value="">↓</option>
                            {rows.map((row) => {
                              // Get the selected table's fields sorted by order
                              const selectedTable = tables.find((t) => t.id === selectedTableId)
                              const sortedFields = selectedTable
                                ? [...(selectedTable.fields ?? [])].sort((a, b) => a.order - b.order)
                                : []
                              // Use first field's value instead of arbitrary Object.values()[0]
                              const firstField = sortedFields[0]
                              const firstValue = firstField ? row.data[firstField.fieldName] : null
                              return (
                                <option key={row.id} value={row.id}>
                                  {firstValue ? String(firstValue).slice(0, 12) : row.id.slice(0, 6)}
                                </option>
                              )
                            })}
                          </select>
                        )}
                        {form.items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            title="Remove this row"
                            style={{
                              background: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: '1px 4px',
                              fontSize: '15px',
                              lineHeight: 1,
                              fontWeight: 'bold',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add row button */}
          {isStaffOrAdmin && (
            <div className="no-print" style={{ marginTop: '4px' }}>
              <button
                onClick={addItem}
                style={{ fontSize: '9px', color: '#6366f1', background: 'none', border: '1px dashed #6366f1', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
              >
                + Add Row
              </button>
            </div>
          )}

          {/* Acknowledgement */}
          <SectionHeader title="ACKNOWLEDGEMENT" />
          <div style={{ border: '1px solid #000', padding: '6px', fontSize: '9px', lineHeight: '1.5' }}>
            I hereby acknowledge that the above listed company property has been issued to me as a{' '}
            <span style={{ textDecoration: 'underline' }}>newly purchased unit/used</span> but in good condition.
          </div>
          <div style={{ padding: '18px 0 4px 0', width: '45%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px', textAlign: 'center' }}>
              EMPLOYEE'S NAME & SIGNATURE | DATE
            </div>
          </div>

          {/* Terms */}
          <SectionHeader title="TERMS AND CONDITIONS" />
          <div style={{ border: '1px solid #000', padding: '6px', fontSize: '8.5px', lineHeight: '1.6' }}>
            {[
              '1.) I am responsible for the equipment or property issued to me;',
              '2.) I will use it in the manner intended;',
              '3.) I will regularly clean and upkeep the equipment;',
              '4.) I will be responsible for any damage done (excluding normal wear and tear);',
              '5.) I shall turn over the above item(s) in the event of retirement, resignation or termination;',
              '6.) I will replace any items issued to me that are damaged or lost at my expense;',
              '7.) I will immediately report to IT Dept. any loss, theft, damage and tampering of equipment;',
              '8.) I authorize a payroll deduction to cover the replacement cost of any item issued to me that is not endorsed for whatever reason, or is not endorsed in good working order in the amount of existing book value;',
              '9.) I understand that failure to endorse the equipment will be considered theft and may lead to criminal prosecution by Company, after due process.',
            ].map((t, i) => <div key={i}>{t}</div>)}
            <div style={{ marginTop: '6px' }}>
              It was explained and I fully understand the terms and condition herein listed above.
            </div>
          </div>

          {/* Conforme */}
          <div style={{ padding: '4px 0', fontSize: '9px' }}>
            <div style={{ marginBottom: '22px' }}>Conforme:</div>
            <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px', textAlign: 'center' }}>
              EMPLOYEE'S NAME & SIGNATURE | DATE
            </div>
          </div>

          {/* Noted by */}
          <table style={{ width: '100%', marginTop: '8px', fontSize: '9px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '4px 8px 4px 0' }}>
                  <div style={{ marginBottom: '18px' }}>Noted by:</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px', textAlign: 'center' }}>
                    DEPARTMENT HEAD NAME & SIGNATURE | DATE
                  </div>
                </td>
                <td style={{ width: '50%', padding: '4px 0 4px 8px' }}>
                  <div style={{ marginBottom: '18px' }}>Noted by:</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px', textAlign: 'center' }}>
                    CHRIS CASEY (IT DIRECTOR) SIGNATURE | DATE
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Sheet Tabs ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1a1d2e] border-t border-gray-200 dark:border-[#2a2d3e] flex items-center gap-1 px-2 py-1 overflow-x-auto shrink-0">
        {isStaffOrAdmin && (
          <>
            <button
              onClick={handleNewForm}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded transition-colors shrink-0"
              title="New form"
            >
              <Plus size={14} />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-[#2a2d3e] shrink-0" />
          </>
        )}

        {/* Unsaved tab */}
        {!activeFormId && isStaffOrAdmin && (
          <div className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white dark:bg-[#2a2d3e] border border-b-0 border-gray-300 dark:border-[#2a2d3e] rounded-t text-indigo-600 dark:text-indigo-400 shrink-0 -mb-px">
            <span>{form.pafNo || 'New Form'}</span>
            <span className="text-gray-400 ml-1">(unsaved)</span>
          </div>
        )}

        {/* Saved form tabs */}
        {savedForms.map((saved) => (
          <div
            key={saved.id}
            className={`group flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-t border border-b-0 shrink-0 -mb-px cursor-pointer transition-colors ${activeFormId === saved.id
              ? 'bg-white dark:bg-[#2a2d3e] border-gray-300 dark:border-[#3a3d4e] text-indigo-600 dark:text-indigo-400'
              : 'bg-gray-100 dark:bg-[#0f1117] border-gray-200 dark:border-[#2a2d3e] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1d2e]'
              }`}
            onClick={() => loadForm(saved)}
          >
            {isViewer ? <Eye size={11} className="shrink-0 text-gray-400" /> : null}
            <span>{saved.pafNo}</span>
            <span className="text-gray-400 text-xs">· {saved.employeeName || 'No name'}</span>
            {isStaffOrAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(saved) }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {savedForms.length === 0 && (
          <span className="text-xs text-gray-400 px-2">No saved forms yet</span>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

      {/* Logo Picker Modal */}
      {showLogoPicker && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowLogoPicker(false)}
        >
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Logo Picker</h2>
              <button onClick={() => setShowLogoPicker(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e]"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {logos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No logos yet. Upload one below.</p>
              ) : logos.map((logo) => (
                <div
                  key={logo.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedLogoId === logo.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-[#2a2d3e] hover:bg-gray-50 dark:hover:bg-[#2a2d3e]'}`}
                  onClick={() => setSelectedLogoId(logo.id)}
                >
                  <img src={logo.dataUrl} alt={logo.name} className="w-16 h-10 object-contain rounded bg-white" />
                  <div className="flex-1 min-w-0"><p className="text-sm text-gray-900 dark:text-white truncate">{logo.name}</p></div>
                  {selectedLogoId === logo.id && <Check size={16} className="text-indigo-600 shrink-0" />}
                  <button onClick={(e) => { e.stopPropagation(); deleteLogo(logo.id) }} className="p-1 text-gray-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="px-4 pb-2">
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors">
                <ImageIcon size={15} /> Upload New Logo
              </button>
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => setShowLogoPicker(false)} className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl shrink-0">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete "{deleteTarget.pafNo}"?</h2>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const SectionHeader = ({ title }: { title: string }) => (
  <div style={{ background: '#000', color: '#fff', padding: '3px 6px', fontWeight: 'bold', fontSize: '10px', margin: '6px 0 0 0' }}>
    {title}
  </div>
)

const sc: React.CSSProperties = { border: '1px solid #000', padding: '3px 5px', fontSize: '9px', verticalAlign: 'middle' }
const si: React.CSSProperties = { border: 'none', outline: 'none', width: '100%', fontSize: '9px', background: 'transparent', color: '#000' }