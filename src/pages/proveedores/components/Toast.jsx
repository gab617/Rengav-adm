import { useState, useEffect } from "react";
import { IconCheck, IconClose, IconInfo, IconWarning } from "../../../components/icons";

export function Toast({ message, type = "success", onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: "bg-gradient-to-r from-green-500 to-emerald-600",
    error: "bg-gradient-to-r from-red-500 to-rose-600",
    warning: "bg-gradient-to-r from-yellow-500 to-amber-600",
    info: "bg-gradient-to-r from-blue-500 to-indigo-600",
  };

  const icons = {
    success: <IconCheck className="w-4 h-4" />,
    error: <IconClose className="w-4 h-4" />,
    warning: <IconWarning className="w-4 h-4" />,
    info: <IconInfo className="w-4 h-4" />,
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`${styles[type]} text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-[400px]`}
      >
        <span className="text-base w-8 h-8 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm">
          {icons[type]}
        </span>
        <span className="flex-1 font-medium">{message}</span>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label="Cerrar notificación"
          className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
