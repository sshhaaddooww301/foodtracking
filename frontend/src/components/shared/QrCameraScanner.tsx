"use client";
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { Camera, RefreshCw, UploadCloud, X, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";

interface QrCameraScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QrCameraScanner({ onScan, onClose }: QrCameraScannerProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "trustchain-qr-reader";

  // Initialize available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment")
          );
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        } else {
          setError("No cameras detected on this device. You can upload a QR image instead.");
        }
      })
      .catch((err) => {
        setError("Camera permission denied or camera not accessible. You can upload a QR code image.");
      });

    return () => {
      stopScanner();
    };
  }, []);

  // Start scanning when camera is selected
  useEffect(() => {
    if (!selectedCamera) return;

    const startScanner = async () => {
      try {
        if (scannerRef.current) {
          await stopScanner();
        }

        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config: Html5QrcodeCameraScanConfig = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          selectedCamera,
          config,
          (decodedText) => {
            // Clean up if it's a full URL
            let code = decodedText;
            if (decodedText.includes("code=")) {
              const urlParams = new URLSearchParams(decodedText.split("?")[1]);
              code = urlParams.get("code") || decodedText;
            } else if (decodedText.startsWith("http")) {
              const parts = decodedText.split("/");
              code = parts[parts.length - 1];
            }
            stopScanner();
            onScan(code.trim());
          },
          (errorMessage) => {
            // Ignore ongoing frame mismatch errors
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        setError("Could not start camera feed. Please check browser permissions or upload an image.");
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [selectedCamera]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner", e);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const html5QrCode = new Html5Qrcode(containerId + "-upload-temp");
      const decoded = await html5QrCode.scanFile(file, true);
      let code = decoded;
      if (decoded.includes("code=")) {
        const urlParams = new URLSearchParams(decoded.split("?")[1]);
        code = urlParams.get("code") || decoded;
      }
      onScan(code.trim());
    } catch (err) {
      setError("No readable QR code found in this image. Please try a clearer picture.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-500/30">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Live QR Scanner
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Point camera at package QR code on the box/strip
          </p>
        </div>

        {/* Viewfinder Window */}
        <div className="relative w-full max-w-[280px] h-[280px] bg-black rounded-xl overflow-hidden border-2 border-blue-500/40 shadow-inner flex items-center justify-center">
          {/* Target Reticles */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-md" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-md" />
            </div>
            {/* Animated Laser Scanning Beam */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2s_infinite]" />
            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-md" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-md" />
            </div>
          </div>

          {/* HTML5 QR Code Mount */}
          <div id={containerId} className="w-full h-full overflow-hidden" />
          <div id={containerId + "-upload-temp"} className="hidden" />
        </div>

        {error && (
          <div className="w-full mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Switch Camera & Upload Actions */}
        <div className="w-full mt-5 space-y-3">
          {cameras.length > 1 && (
            <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                Camera:
              </span>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 max-w-[180px] truncate"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs flex items-center justify-center gap-2 transition font-medium">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                {uploading ? "Scanning File..." : "Upload QR Image"}
              </div>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
