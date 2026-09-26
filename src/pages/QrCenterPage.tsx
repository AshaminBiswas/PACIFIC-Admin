import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { qrApi } from '../api/services';
import type { QrScanResult } from '../types/admin';
import {
  QrCode,
  Camera,
  CameraOff,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  History,
  Sparkles,
  Download,
  Printer,
  Check,
  ShieldCheck,
  FileText,
  Package,
  ArrowRight,
  Maximize2,
  FlipHorizontal,
} from 'lucide-react';

export default function QrCenterPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scan' | 'generate' | 'history'>('scan');

  // Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Generator state
  const [genEntityType, setGenEntityType] = useState<'PI' | 'PO' | 'PRODUCT' | 'BATCH'>('PI');
  const [genEntityId, setGenEntityId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<any | null>(null);

  // Video & Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play audio beep upon successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext might be blocked without user interaction
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
        startBarcodeDetection();
      } else {
        setCameraError('Camera access is not supported by your browser.');
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to access camera. Please enter the QR code or token manually.'
      );
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Toggle Camera Front / Back
  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'scan') {
      stopCamera();
    }
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Barcode Detection via browser BarcodeDetector API if available
  const startBarcodeDetection = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && !scanning) {
              handleProcessPayload(rawValue);
            }
          }
        } catch {
          // Detection error, ignore frame
        }
      }
    }, 400);
  };

  // Handle Payload lookup
  const handleProcessPayload = async (payload: string) => {
    if (!payload.trim()) return;
    setScanning(true);
    playBeep();
    try {
      const res = await qrApi.scan(payload.trim());
      if (res.data) {
        setScanResult(res.data);
      } else {
        setScanResult({
          success: false,
          message: 'No record found matching this QR code.',
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.response?.data?.message || 'Failed to verify QR payload.',
      });
    } finally {
      setScanning(false);
    }
  };

  // Manual verify submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessPayload(manualInput);
  };

  // Load Scan History
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await qrApi.getHistory();
      if (res.data?.data) {
        setRecentScans(res.data.data);
      } else if (Array.isArray(res.data)) {
        setRecentScans(res.data);
      }
    } catch {
      // Fallback empty
      setRecentScans([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle QR Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEntityId.trim()) return;
    setGenerating(true);
    try {
      const res = await qrApi.generate(genEntityType, genEntityId.trim());
      setGeneratedQr(res.data?.data || res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate QR code.');
    } finally {
      setGenerating(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7FB706]/10 text-[#7FB706] text-xs font-semibold uppercase tracking-wider mb-2">
            <QrCode className="w-3.5 h-3.5" />
            Centralized Security Subsystem
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            QR Scanner & Document Verification
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Mobile-first barcode scanning, cryptographic document verification, and asset tracking for Pacific Restroom Cubicles.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              activeTab === 'scan'
                ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Scanner
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              activeTab === 'generate'
                ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            QR Generator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              activeTab === 'history'
                ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* ── TAB 1: SCANNER ─────────────────────────────────────────────────── */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera Viewfinder Box */}
          <div className="lg:col-span-7 bg-[#0e0e24] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-[#7FB706] animate-pulse' : 'bg-gray-500'}`} />
                <h3 className="text-sm font-bold text-white">Camera Viewfinder</h3>
              </div>
              <div className="flex items-center gap-2">
                {cameraActive && (
                  <button
                    onClick={toggleFacingMode}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Flip Camera"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
                  >
                    <CameraOff className="w-4 h-4" />
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7FB706]/20 transition-all min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </button>
                )}
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="relative w-full aspect-video sm:aspect-[4/3] bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Tap "Start Camera" to activate live camera feed or paste a verification token below.
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold transition-all min-h-[44px]"
                  >
                    Launch Camera
                  </button>
                </div>
              )}

              {/* Viewfinder Target Overlays when camera is active */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-[#7FB706]/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(127,183,6,0.15)]">
                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#7FB706] rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#7FB706] rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#7FB706] rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#7FB706] rounded-br-xl" />

                    {/* Animated Scanning Laser */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#B5F823] to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_12px_#7FB706]" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-[#7FB706] font-medium border border-white/10">
                      Align QR code within target area
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-x-4 bottom-4 bg-red-500/90 backdrop-blur-md border border-red-500 text-white text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Manual Token Entry Fallback */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter or paste token/URL (e.g. pi_..., po_..., or http://...)"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanning || !manualInput.trim()}
                  className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-2 shrink-0"
                >
                  {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Verify Code
                </button>
              </form>
            </div>
          </div>

          {/* Verification Result Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#7FB706]" />
                  Scan Analysis Result
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  Real-time cryptographic validation and routing result.
                </p>

                {scanning ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 border-3 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-gray-400">Querying Pacific secure verification ledger...</p>
                  </div>
                ) : !scanResult ? (
                  <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-gray-500 space-y-2">
                    <QrCode className="w-10 h-10 mx-auto opacity-40 text-gray-400" />
                    <p className="text-xs">No active scan. Point camera at a document QR code or enter code above.</p>
                  </div>
                ) : scanResult.success ? (
                  <div className="space-y-4">
                    {/* Status Pill */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#7FB706]">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider">Valid Document Authenticated</p>
                        <p className="text-[11px] text-gray-300 truncate">Token: {scanResult.token}</p>
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    <div className="space-y-2 bg-white/[0.02] border border-white/5 rounded-xl p-4 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Entity Type</span>
                        <span className="font-bold text-white">{scanResult.type || 'DOCUMENT'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400">Entity ID</span>
                        <span className="font-mono text-gray-300 truncate max-w-[160px]">
                          {scanResult.entityId || 'N/A'}
                        </span>
                      </div>
                      {scanResult.data?.number && (
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-gray-400">Document No</span>
                          <span className="font-bold text-[#7FB706]">{scanResult.data.number}</span>
                        </div>
                      )}
                      {scanResult.data?.totalAmount && (
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-gray-400">Authorized Value</span>
                          <span className="font-bold text-white">
                            ₹ {Number(scanResult.data.totalAmount).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {scanResult.data?.status && (
                        <div className="flex justify-between py-1">
                          <span className="text-gray-400">Workflow Status</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                            {scanResult.data.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertCircle className="w-4 h-4" />
                      Invalid or Revoked QR
                    </div>
                    <p className="text-xs text-red-300">{scanResult.message}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {scanResult?.success && scanResult.targetRoute && (
                <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => navigate(scanResult.targetRoute!)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-bold transition-all min-h-[44px]"
                  >
                    <span>Open Record in ERP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href={`/verify/${scanResult.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Public Certificate View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: QR GENERATOR ────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7FB706]" />
              Generate Document or Asset QR
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Create an authenticated QR token linked to any purchase order, proforma invoice, or product batch.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Target Entity Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'PI', label: 'Proforma Invoice' },
                    { type: 'PO', label: 'Purchase Order' },
                    { type: 'PRODUCT', label: 'Product / Hardware' },
                    { type: 'BATCH', label: 'Locker / Panel Batch' },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setGenEntityType(opt.type as any)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all min-h-[44px] ${
                        genEntityType === opt.type
                          ? 'bg-[#7FB706]/15 border-[#7FB706] text-[#7FB706]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Entity ID or Internal UUID *
                </label>
                <input
                  type="text"
                  required
                  value={genEntityId}
                  onChange={(e) => setGenEntityId(e.target.value)}
                  placeholder="e.g. pi_cm123..., po_cm456..., or prod_789"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !genEntityId.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all min-h-[44px]"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Generate Secure QR Code
              </button>
            </form>
          </div>

          {/* Generator Preview Output */}
          <div className="lg:col-span-6 bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
            {generatedQr ? (
              <div className="space-y-4 max-w-sm">
                <div className="p-6 bg-white rounded-2xl shadow-2xl mx-auto w-56 h-56 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      generatedQr.qrData || `http://localhost:5176/verify/${generatedQr.token}`
                    )}`}
                    alt="Generated QR"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">QR Code Ready</h4>
                  <p className="text-xs text-gray-400 font-mono break-all mt-1">
                    {generatedQr.token}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                      generatedQr.qrData || `http://localhost:5176/verify/${generatedQr.token}`
                    )}`}
                    download={`QR_${generatedQr.token}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] rounded-xl text-xs font-semibold text-white transition-colors min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 space-y-2 p-8">
                <QrCode className="w-12 h-12 mx-auto opacity-30 text-gray-400" />
                <p className="text-xs">Generated QR code preview will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: AUDIT & HISTORY ─────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#7FB706]" />
                Recent Scan Logs & Verification Audit
              </h3>
              <p className="text-xs text-gray-400">
                Track who scanned which document, IP addresses, and verification timestamps.
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading audit trail...</p>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No scan logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Token / Code</th>
                    <th className="pb-3 font-semibold">User ID</th>
                    <th className="pb-3 font-semibold">IP Address</th>
                    <th className="pb-3 font-semibold">Device / User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentScans.map((log: any, idx: number) => (
                    <tr key={log.id || idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 text-gray-300">
                        {log.scannedAt || log.createdAt ? new Date(log.scannedAt || log.createdAt).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-3 font-mono text-[#7FB706] truncate max-w-[150px]">
                        {log.token || 'N/A'}
                      </td>
                      <td className="py-3 text-gray-400">{log.scannedByUserId || 'Public / Anon'}</td>
                      <td className="py-3 font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="py-3 text-gray-400 truncate max-w-[200px]">{log.userAgent || 'Web Browser'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
