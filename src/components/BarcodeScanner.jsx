import React, { useEffect, useRef, useState } from "react";

export function BarcodeScanner({ onScan, dark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const openScanner = async () => {
    setIsOpen(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara");
      setHasCamera(false);
    }
  };

  const closeScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let intervalId;

    const tryScan = () => {
      if (!videoRef.current) return;

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      if (canvas.width === 0 || canvas.height === 0) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const barcodeDetector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
        });

        barcodeDetector
          .detect(canvas)
          .then((barcodes) => {
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              onScan(code);
              closeScanner();
            }
          })
          .catch(() => {});
      } catch (err) {
      }
    };

    intervalId = setInterval(tryScan, 500);

    return () => clearInterval(intervalId);
  }, [isOpen, onScan]);

  if (!isOpen) {
    return (
      <button
        onClick={openScanner}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
          ${dark
            ? "bg-purple-600 hover:bg-purple-500 text-white"
            : "bg-purple-500 hover:bg-purple-600 text-white"
        }
        disabled={!hasCamera}
        title={hasCamera ? "Escanear código de barras" : "Cámara no disponible"}
      >
        <span className="text-lg">📷</span>
        <span className="hidden sm:inline">Escanear</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-white font-bold">Escanear código</h2>
        <button
          onClick={closeScanner}
          className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-red-400 text-center p-4">{error}</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-44 border-4 border-yellow-400 rounded-xl" />
          </div>
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-white/70 text-sm">
          Apuntá la cámara al código de barras
        </p>
      </div>
    </div>
  );
}
