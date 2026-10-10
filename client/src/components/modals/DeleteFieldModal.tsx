import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

interface Props {
  fieldName: string;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

export default function DeleteFieldModal({
  fieldName,
  onConfirm,
  onClose,
  isDeleting,
}: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl shrink-0">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Delete "{fieldName}"?
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete the field{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            "{fieldName}"
          </span>
          ? This will remove the column permanently.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
