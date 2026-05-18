import { useModal } from '../../context/ModalContext'
import CreateTableModal from '../tables/CreateTableModal'

export default function ModalManager() {
  const { isCreateTableOpen, closeCreateTable } = useModal()

  return (
    <>
      {isCreateTableOpen && (
        <CreateTableModal onClose={closeCreateTable} />
      )}
    </>
  )
}