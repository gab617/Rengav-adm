import React from 'react'

export function DeleteProduct({handleDelete, setShowConfirmDelete}) {
  return (
    <div className="absolute bottom-[2.5em] mt-2 bg-white border shadow-2xl p-3 w-64 z-10 rounded-2xl">
    <p className="text-center text-red-600 font-semibold">
      ¿Seguro que deseas eliminar este producto?
    </p>
    <div className="flex justify-between mt-2">
      <button
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleDelete}
      >
        ✅ Sí, eliminar
      </button>
      <button
        className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
        onClick={() => setShowConfirmDelete(false)}
      >
        ❌ Cancelar
      </button>
    </div>
  </div>
  )
}
