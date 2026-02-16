import React from "react";

export function DeleteProduct({ handleDelete, setShowConfirmDelete }) {
  const esMobile = window.innerWidth < 768;

  if (esMobile) {
    // ===== MOBILE → MODAL CENTRADO =====
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl p-5 w-[90%] max-w-sm">
          <p className="text-center text-red-600 font-semibold mb-4">
            ¿Seguro que deseas eliminar este producto?
          </p>

          <div className="flex justify-between gap-3">
            <button
              className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              onClick={handleDelete}
            >
              ✅ Sí, eliminar
            </button>
            <button
              className="flex-1 px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
              onClick={() => setShowConfirmDelete(false)}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== DESKTOP → POPOVER ACTUAL =====
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
  );
}
