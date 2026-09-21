import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicAckApi } from '../api/services';
import type { PackingList } from '../types/admin';
import {
  CheckCircle2,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  User,
  Phone,
  Eraser,
  PenTool,
  Printer,
  Boxes,
  Truck,
} from 'lucide-react';
// @ts-ignore
import logo from '@/image/logo/logo.webp';

export default function ConsigneeAckPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pl, setPl] = useState<PackingList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [receivedByName, setReceivedByName] = useState('');
  const [receivedByPhone, setReceivedByPhone] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    async function fetchPackingList() {
      if (!token) {
        setError('Verification token is missing in the request URL.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await publicAckApi.getByToken(token);
        if (res.data?.data) {
          setPl(res.data.data);
          if (res.data.data.receiptStatus === 'ACKNOWLEDGED') {
            setSuccess(true);
            setReceivedByName(res.data.data.receivedByName || '');
            setReceivedByPhone(res.data.data.receivedByPhone || '');
            setSignatureData(res.data.data.receiptSignatureData || '');
          }
        } else {
          setError('Unable to authenticate this delivery token against Pacific logistics records.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Verification service temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    }
    fetchPackingList();
  }, [token]);

  // Setup canvas drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7FB706';

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!receivedByName.trim()) {
      alert('Please enter the name of the person receiving the consignments.');
      return;
    }
    if (!receivedByPhone.trim()) {
      alert('Please enter a contact phone number.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await publicAckApi.acknowledgeByToken(token, {
        receivedByName: receivedByName.trim(),
        receivedByPhone: receivedByPhone.trim(),
        signatureData: signatureData || undefined,
      });
      if (res.data?.data) {
        setPl(res.data.data);
        setSuccess(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit delivery acknowledgment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070714] text-gray-100 flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-[#7FB706]/30">
      {/* Header */}
      <header className="w-full max-w-3xl flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Pacific Products & Solutions"
            className="h-12 w-auto object-contain rounded-xl bg-white/5 p-1 border border-white/10"
          />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              PACIFIC PRODUCTS & SOLUTIONS
            </h1>
            <p className="text-[11px] text-[#7FB706] font-medium tracking-wider uppercase">
              Consignee Delivery Acknowledgment Portal
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7FB706]" />
          <span>Official Verification Subsystem</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-3xl my-6 flex-1">
        {loading ? (
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 border-4 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin" />
            <h2 className="text-base font-bold text-white mb-1">Authenticating Consignment Token</h2>
            <p className="text-xs text-gray-400">Verifying security signature with Pacific logistics registry...</p>
          </div>
        ) : error || !pl ? (
          <div className="bg-[#0e0e24] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invalid or Expired Consignment</h2>
            <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">{error}</p>
          </div>
        ) : success ? (
          /* Acknowledgment Confirmed Card */
          <div className="bg-[#0e0e24] border border-[#7FB706]/30 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7FB706] via-[#B5F823] to-[#7FB706]" />
            <div className="w-16 h-16 bg-[#7FB706]/10 border border-[#7FB706]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#7FB706]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-center text-white mb-1">
              Delivery Successfully Acknowledged
            </h2>
            <p className="text-xs sm:text-sm text-center text-[#7FB706] mb-6">
              Consignment received and logged into Pacific ERP system.
            </p>

            {/* Receipt Summary */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-5 mb-6 space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Packing List Reference:</span>
                <span className="font-mono font-bold text-white">{pl.packingListNumber}</span>
              </div>
              {pl.order && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Sales Order No.:</span>
                  <span className="font-mono text-gray-200">{pl.order.orderNumber}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Delivered To:</span>
                <span className="font-medium text-white">{pl.shipToName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Received By:</span>
                <span className="font-bold text-[#7FB706]">{receivedByName} ({receivedByPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Acknowledgment Time:</span>
                <span className="text-gray-300">
                  {pl.receivedAt ? new Date(pl.receivedAt).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Digital Signature Display */}
            {signatureData && (
              <div className="border border-white/10 rounded-xl p-4 bg-white/5 text-center mb-6">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Consignee Digital Signature</p>
                <img src={signatureData} alt="Consignee Signature" className="max-h-24 mx-auto object-contain invert" />
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4" />
                Print Delivery Receipt
              </button>
            </div>
          </div>
        ) : (
          /* Form to acknowledge receipt */
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-6">
              <div className="p-3 bg-[#7FB706]/10 border border-[#7FB706]/30 rounded-xl text-[#7FB706]">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Confirm Consignment Delivery</h2>
                <p className="text-xs text-gray-400">
                  Packing List Ref: <span className="font-mono text-[#7FB706]">{pl.packingListNumber}</span>
                </p>
              </div>
            </div>

            {/* Delivery Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/20 border border-white/5 rounded-xl p-4 mb-6 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Consignor:</span>
                <span className="text-white font-medium">{pl.consignorName}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Destination / Ship-To:</span>
                <span className="text-white font-medium">{pl.shipToName}</span>
                <p className="text-gray-400 text-[11px] mt-0.5">{pl.shipToAddress}</p>
              </div>
              {pl.siteContactName && (
                <div>
                  <span className="text-gray-400 block mb-0.5">Site Contact:</span>
                  <span className="text-gray-200">{pl.siteContactName} {pl.siteContactPhone ? `(${pl.siteContactPhone})` : ''}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400 block mb-0.5">Package Summary:</span>
                <span className="text-[#7FB706] font-semibold">{pl.items?.length || 0} Item(s) | {pl.totalPackages || 'N/A'} Packages</span>
              </div>
            </div>

            {/* Consignment Items Accordion/Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden mb-6">
              <div className="bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 flex justify-between">
                <span>Consigned Items</span>
                <span>Qty & Nature</span>
              </div>
              <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                {pl.items?.map((it, idx) => (
                  <div key={it.id || idx} className="px-4 py-2.5 text-xs flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{it.description}</p>
                      {it.size && <span className="text-[11px] text-gray-400 mr-3">Size: {it.size}</span>}
                      {it.natureOfPacket && (
                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded">
                          {it.natureOfPacket}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#7FB706]">{Number(it.quantity)}</span>
                      {it.noOfPackets != null && (
                        <p className="text-[10px] text-gray-400">{it.noOfPackets} Pkt(s)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acknowledgment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Receiver Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={receivedByName}
                      onChange={(e) => setReceivedByName(e.target.value)}
                      placeholder="e.g. Vikram Singh"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Receiver Mobile Phone <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={receivedByPhone}
                      onChange={(e) => setReceivedByPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                </div>
              </div>

              {/* Digital Signature Canvas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-[#7FB706]" />
                    Draw Digital Signature on Screen
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 transition"
                  >
                    <Eraser className="w-3 h-3" />
                    Clear Signature
                  </button>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden touch-none relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair block"
                  />
                  {!signatureData && !isDrawing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 text-xs">
                      Sign here using finger or stylus
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#7FB706] to-[#9ad418] hover:from-[#8cc707] hover:to-[#a7e41e] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#7FB706]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Submitting Acknowledgment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Delivery & Sign Digitally
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl border-t border-white/10 pt-4 text-center text-xs text-gray-500">
        Pacific Products & Solutions © {new Date().getFullYear()} — Commercial Restroom Cubicle Logistics Subsystem
      </footer>
    </div>
  );
}
