import { useEffect, useState } from 'react'
import { X, Printer } from 'lucide-react'
import QRCode from 'qrcode'

interface Field {
  id: string
  fieldName: string
  fieldType: string
  required: boolean
  isStockField: boolean
  order: number
}

interface Row {
  id: string
  data: Record<string, any>
  createdAt: string
  updatedAt: string
  updatedBy: string | null
  user: { name: string }
  updatedByUser: { name: string } | null
}

interface Props {
  row: Row
  fields: Field[]
  tableName: string
  onClose: () => void
}

export default function RowDetailModal({ row, fields, tableName, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // ─── Sort fields by order ─────────────────────────────────────────────────
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  // ─── Bottom label: first column's value ───────────────────────────────────
  const firstField = sortedFields[0]
  const bottomLabel = firstField
    ? String(row.data[firstField.fieldName] ?? '')
    : row.id.slice(0, 8).toUpperCase()

  // Fields to always exclude from QR
  const QR_EXCLUDED_FIELDS = ['cost', 'Cost', 'COST']

  // Build QR content — skip empty fields AND excluded fields
  const qrContent = sortedFields
    .filter((f) => !QR_EXCLUDED_FIELDS.map(e => e.toLowerCase()).includes(f.fieldName.toLowerCase()))
    .map((f) => {
      const value = row.data[f.fieldName]
      if (value === undefined || value === null || value === '') return null
      return `${f.fieldName}: ${value}`
    })
    .filter(Boolean)
    .join('\n')

  useEffect(() => {
    QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQrDataUrl)
  }, [qrContent])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=700')
    if (!printWindow) return
    sortedFields
      .filter((f) => !['cost'].includes(f.fieldName.toLowerCase()))
      .map((f) => {
        const value = row.data[f.fieldName]
        if (value === undefined || value === null || value === '') return null
        return `${f.fieldName}: ${value}`
      })
      .filter(Boolean)
      .join('\n')


    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${bottomLabel}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              width: 200px;
              align-items: center;
              justify-content: center;
              background: white;
              font-family: Arial, sans-serif;
            }
            .label {
              width: 300px;
              border: 6px solid #1a1a1a;
              border-radius: 8px;
              overflow: hidden;
              background: white;
            }
            .header {
              background: #1a1a1a;
              color: white;
              text-align: center;
              padding: 14px 10px;
            }
            .header p:first-child {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
              color: black;
            }
            .header p:last-child {
              font-size: 16px;
              font-weight: bold;
              color: black;
            }
            .qr-wrapper {
              padding: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            .qr-wrapper img {
              width: 240px;
              height: 240px;
            }
            .footer {
              background: #1a1a1a;
              color: black;
              text-align: center;
              padding: 14px 10px;
              font-size: 16px;
              font-weight: bold;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <p>Please do not remove.</p>
              <p>GTO Property</p>
            </div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="footer">
              (${bottomLabel})
            </div>
          </div>
          <script>
            window.onload = () => { 
              window.print(); 
              window.close(); 
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const renderValue = (field: Field) => {
    const value = row.data[field.fieldName]
    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 dark:text-gray-600">—</span>
    }
    if (field.fieldType === 'boolean') {
      return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${value === true || value === 'true'
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
          {value === true || value === 'true' ? 'Yes' : 'No'}
        </span>
      )
    }
    if (field.fieldType === 'date' && value) {
      return new Date(value).toLocaleDateString()
    }
    return String(value)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="custom-scrollbar bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Row Details
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{tableName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

          {/* Custom fields */}
          {sortedFields.map((field) => (
            <div
              key={field.id}
              className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 dark:border-[#2a2d3e] last:border-0"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 w-40 pt-0.5">
                {field.fieldName}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </span>
              <span className="text-sm text-gray-900 dark:text-white text-right">
                {renderValue(field)}
              </span>
            </div>
          ))}

          {/* System fields */}
          <div className="pt-3 space-y-0">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider pb-2">
              System Fields
            </p>
            {[
              { label: 'Created By', value: row.user?.name ?? '—' },
              { label: 'Created At', value: new Date(row.createdAt).toLocaleString() },
              { label: 'Updated By', value: row.updatedByUser?.name ?? '—' },
              { label: 'Updated At', value: row.updatedBy ? new Date(row.updatedAt).toLocaleString() : '—' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[#2a2d3e] last:border-0"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold w-40">
                  {item.label}
                </span>
                <span className="text-sm text-gray-900 dark:text-white text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* QR Code Preview */}
          <div className="pt-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">
              QR Code Preview
            </p>
            <div className="flex justify-center">
              <div
                style={{
                  width: '200px',
                  border: '5px solid #1a1a1a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white',
                }}
              >
                {/* Header */}
                <div style={{ background: '#1a1a1a', color: 'white', textAlign: 'center', padding: '10px 8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>Please do not remove.</p>
                  <p style={{ fontSize: '12px', fontWeight: 'bold' }}>GTO Property</p>
                </div>
                {/* QR */}
                <div style={{ background: 'white', padding: '10px', display: 'flex', justifyContent: 'center' }}>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                  ) : (
                    <div style={{ width: '150px', height: '150px', background: '#f3f4f6', borderRadius: '4px' }} />
                  )}
                </div>
                {/* Footer */}
                <div style={{ background: '#1a1a1a', color: 'white', textAlign: 'center', padding: '10px 8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    ({bottomLabel})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Printer size={15} />
            Print QR Label
          </button>
        </div>
      </div>
    </div>
  )
}
