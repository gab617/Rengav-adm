import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../services/supabaseClient";

export function DeleteProduct({
  handleDelete,
  setShowConfirmDelete,
  productId,
  esCustom = false,
  imagenesCount = 0,
}) {
  // "cargando" | "con" | "sin" | "error"
  const [ventasCheck, setVentasCheck] = useState("cargando");

  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const { count, error } = await supabase
          .from("user_sales_detail")
          .select("id", { count: "exact", head: true })
          .eq("product_id", productId);

        if (!activo) return;

        if (error) {
          setVentasCheck("error");
        } else {
          setVentasCheck((count || 0) > 0 ? "con" : "sin");
        }
      } catch {
        if (activo) setVentasCheck("error");
      }
    })();

    return () => {
      activo = false;
    };
  }, [productId]);

  const quedaDesactivado = ventasCheck === "con";

  return createPortal(
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

          <div className="text-sm mt-2 space-y-2">
            {esCustom ? (
              <p className="text-gray-500 dark:text-gray-400">
                Es un <b>producto personalizado</b>: se quita de tu catálogo,
                pero las imágenes y el molde se conservan en "Productos
                personalizados".
              </p>
            ) : (
              imagenesCount > 0 && (
                <p className="text-gray-500 dark:text-gray-400">
                  Se eliminarán del almacenamiento sus {imagenesCount}{" "}
                  {imagenesCount === 1 ? "imagen" : "imágenes"}.
                </p>
              )
            )}

            {ventasCheck === "cargando" && (
              <p className="text-gray-400 dark:text-gray-500 text-xs animate-pulse">
                Verificando ventas asociadas...
              </p>
            )}

            {ventasCheck === "con" && (
              <p className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1.5">
                Tiene ventas registradas: <b>no se eliminará</b>. Quedará
                desactivado (stock en 0) para conservar su historial, y podrás
                reactivarlo cuando quieras.
              </p>
            )}

            {ventasCheck === "sin" && (
              <p
                className={`rounded-lg px-2 py-1.5 ${
                  esCustom
                    ? "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/40"
                    : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                }`}
              >
                No tiene ventas registradas:{" "}
                {esCustom
                  ? "se quita del catálogo directamente."
                  : "se eliminará definitivamente. Irreversible."}
              </p>
            )}

            {ventasCheck === "error" && (
              <p className="text-gray-500 dark:text-gray-400">
                Si tiene ventas registradas, no se eliminará: quedará
                desactivado. Si no las tiene, se elimina definitivamente.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            onClick={handleDelete}
          >
            {quedaDesactivado ? "🚫 Desactivar" : "✅ Eliminar"}
          </button>
          <button
            className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
            onClick={() => setShowConfirmDelete(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}