import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ModalContextType {
  openCreateTable: () => void
  closeCreateTable: () => void
  isCreateTableOpen: boolean
  tableRefreshKey: number
  triggerTableRefresh: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)

  const triggerTableRefresh = useCallback(() => {
    setTableRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <ModalContext.Provider
      value={{
        isCreateTableOpen,
        openCreateTable: () => setIsCreateTableOpen(true),
        closeCreateTable: () => setIsCreateTableOpen(false),
        tableRefreshKey,
        triggerTableRefresh,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) throw new Error('useModal must be used within ModalProvider')
  return context
}