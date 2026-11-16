import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  RotateCw,
  Columns,
  Download,
  Share2,
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  User,
  HardHat,
  Award,
  Sparkles,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Employee } from '../../types/employee';

interface EmployeeIdCardModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  isUpFactory?: boolean;
}

export function EmployeeIdCardModal({
  employee,
  isOpen,
  onClose,
  isUpFactory = true,
}: EmployeeIdCardModalProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [viewMode, setViewMode] = useState<'single' | 'both'>('both');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !employee) return null;

  const employeeName = employee.name || 'Worker Name';
  const employeeId = employee.employeeId || 'UP-WRK-001';
  const designation = employee.designation || 'Factory Technician';
  const department = employee.department || 'Production & Fabrication';
  const gender = employee.gender ? employee.gender.toUpperCase() : 'MALE';
  const mobile = employee.phone || 'N/A';
  const whatsapp = employee.whatsappNo || employee.phone || mobile;
  const joiningDateFormatted = employee.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';
  const bloodGroup = employee.emergencyContact ? employee.emergencyContact : 'O+ (Standard)';

  // Verification QR data
  const qrData = encodeURIComponent(
    `PACIFIC RESTROOM CUBICLES\n` +
      `UNIT: UP MANUFACTURING FACILITY\n` +
      `EMP ID: ${employeeId}\n` +
      `NAME: ${employeeName}\n` +
      `DESIGNATION: ${designation}\n` +
      `DEPT: ${department}\n` +
      `GENDER: ${gender}\n` +
      `MOBILE: ${mobile}\n` +
      `JOINED: ${joiningDateFormatted}\n` +
      `STATUS: ${employee.status}\n` +
      `VERIFY: https://pacificcubicles.com/verify/emp/${employeeId}`
  );

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}&color=ffffff&bgcolor=030213&qzone=1`;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = (whatsapp || mobile).replace(/\D/g, '');
    const phoneInt = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(
      `🪪 *PACIFIC RESTROOM CUBICLES — OFFICIAL EMPLOYEE ID CARD*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Name:* ${employeeName}\n` +
        `🆔 *Employee ID:* ${employeeId}\n` +
        `💼 *Designation:* ${designation}\n` +
        `🏭 *Department:* ${department}\n` +
        `🚻 *Gender:* ${gender}\n` +
        `📞 *Mobile:* ${mobile}\n` +
        `📅 *Joining Date:* ${joiningDateFormatted}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 *Unit:* Pacific Restroom Cubicles (UP Factory)\n` +
        `📍 *Address:* Plot No. 42-B, Industrial Area Phase II, UPSIDC, Greater Noida, UP - 201306\n` +
        `🌐 *Portal:* www.pacificcubicles.com\n\n` +
        `_Your digital factory identity card has been approved and registered in Pacific Workforce ERP._`
    );
    window.open(`https://wa.me/${phoneInt}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-[#0a091e] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl relative my-auto">
        {/* ── Modal Header (Hidden on Print) ──────────────────────────────── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7FB706]/20 to-emerald-500/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706]">
              <HardHat size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Employee Identity Card
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/30 font-semibold">
                  {isUpFactory ? 'UP Factory • Super Admin' : 'Pacific Corporate'}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Official double-sided workforce security credential for {employeeName} ({employeeId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-[#030213] p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  viewMode === 'both' ? 'bg-[#7FB706] text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  viewMode === 'single' ? 'bg-[#7FB706] text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Single Side
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Toolbar / Controls Bar (Hidden on Print) ────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5 bg-[#030213]/70 border-b border-white/10 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {viewMode === 'single' && (
              <button
                type="button"
                onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition font-medium cursor-pointer"
              >
                <RotateCw size={13} className="text-[#7FB706]" />
                Flip to {activeSide === 'front' ? 'Back Side' : 'Front Side'}
              </button>
            )}
            <span className="text-gray-400 text-[11px] hidden md:inline">
              Standard CR80 ID Card Format (85.6mm × 54mm) • Ready for Thermal PVC / Paper Card Printing
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-medium transition cursor-pointer"
              title="Send digital ID card via WhatsApp to worker"
            >
              <MessageCircle size={14} />
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7FB706] hover:bg-[#6ea105] text-white rounded-lg font-semibold shadow-lg shadow-[#7FB706]/20 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print ID Card</span>
            </button>
          </div>
        </div>

        {/* ── Card Display Canvas ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-gradient-to-b from-[#05041a] to-[#02010c] id-card-print-container">
          <div
            className={`flex flex-col ${
              viewMode === 'both' ? 'lg:flex-row items-center justify-center' : 'items-center'
            } gap-6 sm:gap-8 w-full max-w-4xl`}
          >
            {/* ════════════════════════════════════════════════════════════════
                FRONT SIDE OF ID CARD
            ════════════════════════════════════════════════════════════════ */}
            {(viewMode === 'both' || activeSide === 'front') && (
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1 print:hidden">
                  <span className="w-2 h-2 rounded-full bg-[#7FB706]" /> Front Side — Worker Credentials
                </span>

                <div
                  id="id-card-front"
                  className="w-[320px] sm:w-[330px] h-[510px] rounded-2xl bg-gradient-to-b from-[#0d0d2b] via-[#09081f] to-[#040314] border-2 border-white/20 p-4 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white select-none id-card-face print:border-black print:text-black"
                  style={{
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 25px rgba(127,183,6,0.15)',
                  }}
                >
                  {/* Decorative Lanyard Punch Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-white/10 border border-white/20" />

                  {/* Top Background Glow */}
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#7FB706]/15 rounded-full blur-2xl pointer-events-none" />

                  {/* ── Card Header ────────────────────────────────────────── */}
                  <div className="pt-2 text-center border-b border-white/10 pb-2 relative z-10">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#7FB706] flex items-center justify-center text-[#030213] font-black text-xs shadow-md">
                        P
                      </div>
                      <div className="text-left">
                        <h2 className="text-xs font-black tracking-wider uppercase text-white leading-tight">
                          PACIFIC RESTROOM CUBICLE
                        </h2>
                        <p className="text-[9px] font-semibold text-[#7FB706] tracking-widest uppercase">
                          UP Factory • Workforce Division
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Profile Photo (1:1 Ratio) ──────────────────────────── */}
                  <div className="flex flex-col items-center pt-2 relative z-10">
                    <div className="relative group">
                      <div className="w-28 h-28 sm:w-30 sm:h-30 rounded-2xl p-1 bg-gradient-to-br from-[#7FB706] via-emerald-400 to-cyan-500 shadow-xl overflow-hidden">
                        <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#030213] flex items-center justify-center">
                          {employee.photoUrl ? (
                            <img
                              src={employee.photoUrl}
                              alt={employeeName}
                              className="w-full h-full object-cover aspect-square"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 flex flex-col items-center justify-center text-white">
                              <span className="text-2xl font-black text-[#7FB706]">
                                {employeeName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </span>
                              <span className="text-[9px] text-gray-400 mt-1 uppercase font-semibold">1:1 Photo</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Security Hologram Badge */}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-2 border-[#030213] flex items-center justify-center text-[#030213] shadow-md">
                        <ShieldCheck size={14} className="stroke-[2.5]" />
                      </div>
                    </div>

                    {/* Employee Name & ID */}
                    <h3 className="mt-2.5 text-base sm:text-lg font-black text-white text-center leading-tight tracking-wide px-2">
                      {employeeName}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-[#7FB706]/20 border border-[#7FB706]/40 text-[#7FB706] font-mono text-xs font-bold">
                      <span>ID:</span>
                      <span>{employeeId}</span>
                    </div>
                  </div>

                  {/* ── Employee Details Grid ──────────────────────────────── */}
                  <div className="bg-[#030213]/80 border border-white/10 rounded-xl p-2.5 my-1 space-y-1 text-[11px] relative z-10 backdrop-blur-sm">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400 font-medium">Designation:</span>
                      <span className="font-bold text-white text-right truncate max-w-[170px]">{designation}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400 font-medium">Department:</span>
                      <span className="font-semibold text-cyan-300 text-right truncate max-w-[170px]">
                        {department}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400 font-medium">Gender / Blood:</span>
                      <span className="font-semibold text-white">
                        {gender} • {bloodGroup}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-400 font-medium">Mobile No:</span>
                      <span className="font-mono font-semibold text-emerald-400">{mobile}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-medium">Joined Date:</span>
                      <span className="font-medium text-gray-200">{joiningDateFormatted}</span>
                    </div>
                  </div>

                  {/* ── Card Footer & Mini QR ──────────────────────────────── */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 p-0.5 bg-white rounded-lg overflow-hidden shrink-0 shadow">
                        <img
                          src={qrCodeUrl}
                          alt="Verification QR"
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="text-[9px] leading-tight text-gray-400">
                        <p className="font-bold text-white uppercase tracking-wider">VERIFIED CREDENTIAL</p>
                        <p>Scan to authenticate</p>
                        <p className="text-[#7FB706] font-semibold">Valid: 2026-2027</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="w-16 h-5 border-b border-white/40 mb-0.5" />
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block">Auth Sign</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                BACK SIDE OF ID CARD
            ════════════════════════════════════════════════════════════════ */}
            {(viewMode === 'both' || activeSide === 'back') && (
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1 print:hidden">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Back Side — Company & Factory Information
                </span>

                <div
                  id="id-card-back"
                  className="w-[320px] sm:w-[330px] h-[510px] rounded-2xl bg-gradient-to-b from-[#0a0921] via-[#060517] to-[#02010c] border-2 border-white/20 p-4 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white select-none id-card-face print:border-black print:text-black"
                  style={{
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 25px rgba(6,182,212,0.15)',
                  }}
                >
                  {/* Decorative Lanyard Punch Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-white/10 border border-white/20" />

                  {/* ── Top Header ────────────────────────────────────────── */}
                  <div className="pt-2 text-center border-b border-white/10 pb-2 relative z-10">
                    <h2 className="text-xs font-black tracking-wider uppercase text-white leading-tight">
                      PACIFIC RESTROOM CUBICLES
                    </h2>
                    <p className="text-[9px] font-semibold text-cyan-400 tracking-widest uppercase">
                      Manufacturing Division • Uttar Pradesh
                    </p>
                  </div>

                  {/* ── Company Address & Unit Information ────────────────── */}
                  <div className="space-y-2 relative z-10 text-[11px]">
                    <div className="p-2 bg-[#030213]/80 border border-white/10 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-[#7FB706] font-bold text-[10px] uppercase tracking-wider">
                        <Building2 size={13} />
                        <span>Factory & Production Unit</span>
                      </div>
                      <p className="text-gray-300 text-[10px] leading-relaxed">
                        Plot No. 42-B, Industrial Area Phase II, UPSIDC, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh — 201306, India.
                      </p>
                    </div>

                    <div className="p-2 bg-[#030213]/80 border border-white/10 rounded-xl space-y-1 text-[10px]">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                        <Globe size={13} />
                        <span>Corporate Office & Inquiries</span>
                      </div>
                      <div className="space-y-0.5 text-gray-300">
                        <p className="flex items-center gap-1">
                          <Phone size={11} className="text-[#7FB706]" /> +91 98300 00000 / +91 80000 00000
                        </p>
                        <p className="flex items-center gap-1">
                          <Mail size={11} className="text-blue-400" /> hr@pacificcubicles.com
                        </p>
                        <p className="flex items-center gap-1">
                          <Globe size={11} className="text-purple-400" /> www.pacificcubicles.com
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Terms of Use & Safety Policy ─────────────────────── */}
                  <div className="p-2.5 bg-[#030213]/90 border border-white/10 rounded-xl space-y-1 text-[9px] text-gray-400 relative z-10 leading-tight">
                    <span className="text-[10px] font-bold uppercase text-amber-400 block tracking-wide">
                      Instructions & Conditions
                    </span>
                    <ol className="list-decimal pl-3 space-y-1">
                      <li>This credential card remains the exclusive property of Pacific Restroom Cubicles.</li>
                      <li>Must be visibly displayed at all times within factory plant, warehouse, and site installations.</li>
                      <li>Non-transferable; any misuse will attract immediate disciplinary action.</li>
                      <li>If found, kindly drop into any post box or return to the UP Factory address above.</li>
                    </ol>
                  </div>

                  {/* ── Authorized Signatory Stamp & Signature ────────────── */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between relative z-10 text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full border border-dashed border-[#7FB706] flex items-center justify-center text-[7px] font-black text-[#7FB706] uppercase text-center leading-none p-0.5">
                        PACIFIC SEAL
                      </div>
                      <div className="text-[8px] text-gray-400">
                        <p className="font-bold text-white">UP PLANT HR</p>
                        <p>Authorized Issued</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-signature text-sm text-[#7FB706] italic font-serif leading-none pr-1">
                        Pacific HR
                      </div>
                      <div className="w-20 h-0.5 bg-white/30 my-0.5 ml-auto" />
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block">
                        Factory Manager Sign
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-[#030213] rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Digital ID Card Verified & Ready for Factory Gate Scanning</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition cursor-pointer"
            >
              Close Window
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Dual Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Embedded Print CSS for Physical ID Card Dimensions ────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .id-card-print-container,
          .id-card-print-container * {
            visibility: visible;
          }
          .id-card-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: #ffffff !important;
            padding: 10mm !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 15mm !important;
            justify-content: center !important;
          }
          .id-card-face {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1.5px solid #000000 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card-face * {
            color: #000000 !important;
            border-color: #cccccc !important;
          }
          .id-card-face .text-white {
            color: #000000 !important;
          }
          .id-card-face .text-gray-400,
          .id-card-face .text-gray-300,
          .id-card-face .text-gray-200 {
            color: #333333 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default EmployeeIdCardModal;
