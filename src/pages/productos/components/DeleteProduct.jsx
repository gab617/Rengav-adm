import React from "react";

export function DeleteProduct({ handleDelete, setShowConfirmDelete }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowConfirmDelete(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-[90%] max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">⚠️</div>
          <p className="text-red-600 dark:text-red-400 font-semibold">
            ¿Seguro que deseas eliminar este producto?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Esta acción no se puede deshacer
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            onClick={handleDelete}
          >
            ✅ Eliminar
          </button>
          <button
            className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
            onClick={() => setShowConfirmDelete(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
