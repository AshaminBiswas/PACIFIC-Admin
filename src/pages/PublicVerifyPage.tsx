import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { qrApi } from '../api/services';
import type { PublicVerificationData } from '../types/admin';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Printer,
  ExternalLink,
  Building2,
  Calendar,
  FileCheck,
  CreditCard,
  Building,
  Phone,
  Mail,
  Lock,
  Download,
  Layers,
} from 'lucide-react';
// @ts-ignore
import logo from '@/image/logo/logo.webp';

export default function PublicVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PublicVerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError('Verification token is missing in the request URL.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await qrApi.verifyPublicToken(token);
        if (res.data) {
          setResult(res.data);
        } else {
          setResult({
            valid: false,
            message: 'Unable to authenticate this token against Pacific security records.',
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Verification service temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070714] text-gray-100 flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-[#7FB706]/30">
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-white/10">
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
              Official Document Verification Subsystem
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <Lock className="w-3.5 h-3.5 text-[#7FB706]" />
          <span>SSL 256-bit Encrypted</span>
        </div>
      </header>

      {/* Main Verification Card */}
      <main className="w-full max-w-4xl my-8 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin" />
            <h2 className="text-lg font-bold text-white mb-1">Verifying Digital Signature</h2>
            <p className="text-xs text-gray-400">
              Querying Pacific cryptographically signed document registry...
            </p>
          </div>
        ) : error || !result?.valid ? (
          <div className="bg-[#0e0e24] border border-red-500/30 rounded-2xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400 shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-sm text-red-300 mb-6 max-w-md mx-auto">
              {error || result?.message || 'This document signature could not be verified or has been revoked.'}
            </p>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-left text-xs text-gray-300 space-y-2 mb-6">
              <p className="font-semibold text-red-400">Security Warning:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-400">
                <li>Do not make payments to unauthorized bank accounts.</li>
                <li>Verify all invoices directly with Pacific Corporate Accounts before honoring payment requests.</li>
                <li>Contact Pacific verification hotline: +91 98765 43210 or email accounts@pacificcubicles.com.</li>
              </ul>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Back to Pacific Portal
            </Link>
          </div>
        ) : (
          <div className="bg-[#0e0e24] border border-[#7FB706]/30 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7FB706] to-[#B5F823]" />

            {/* Authenticity Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 bg-[#7FB706]/15 border border-[#7FB706]/40 rounded-2xl flex items-center justify-center text-[#7FB706] shadow-lg shadow-[#7FB706]/10 shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7FB706]/20 text-[#7FB706] text-[11px] font-bold tracking-wide uppercase mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authentic Verified Document
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {result.document?.documentNumber}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {result.quotation && (
                  <a
                    href={`/api/v1/sales/quotations/${result.quotation.id}/pdf?download=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#B5F823] text-black font-bold rounded-xl text-xs transition-colors shadow-lg shadow-[#7FB706]/20"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                )}
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#7FB706]" />
                  Print Certificate
                </button>
              </div>
            </div>

            {/* Document Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Document Type
                </span>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FileCheck className="w-4 h-4 text-[#7FB706]" />
                  <span>
                    {result.document?.documentType === 'PI'
                      ? 'Proforma Invoice (PI)'
                      : result.document?.documentType === 'PO'
                      ? 'Purchase Order (PO)'
                      : result.document?.documentType === 'QUOTATION' || result.document?.documentType === 'QT'
                      ? 'Domestic Sales Quotation'
                      : result.document?.documentType === 'EXPORT_QUOTATION'
                      ? 'Export Quotation'
                      : result.document?.documentType === 'ORDER' || result.document?.documentType === 'SO'
                      ? 'Sales Order'
                      : result.document?.documentType === 'INVOICE' || result.document?.documentType === 'INV'
                      ? 'Tax Invoice / Bill'
                      : result.document?.documentType === 'PACKING_LIST' || result.document?.documentType === 'PL'
                      ? 'Packing List / Dispatch Consignment'
                      : result.document?.documentType === 'HARDWARE_ISSUE' || result.document?.documentType === 'HIL'
                      ? 'Hardware Issue Slip'
                      : result.document?.documentType}
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Status
                </span>
                <div className="flex items-center gap-2 text-[#7FB706] font-bold text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#7FB706] animate-pulse" />
                  <span>{result.document?.status}</span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Issuing Entity & Branch
                </span>
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{result.document?.companyName}</span>
                </div>
                <div className="mt-1">
                  {result.document?.documentNumber?.startsWith('PPSK/') || result.document?.companyName?.toLowerCase().includes('kolkata') ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      Kolkata Branch
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                      Main Branch (Delhi HQ)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Billed To / Party
                </span>
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Building className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{result.document?.partyName}</span>
                </div>
                {result.quotation?.projectName && (
                  <p className="text-[11px] text-gray-400 mt-1">Project: <span className="text-white font-medium">{result.quotation.projectName}</span></p>
                )}
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Document Date
                </span>
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {result.document?.date
                      ? new Date(result.document.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                {result.quotation?.validUntil && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Valid Until: <span className="text-gray-300 font-medium">{new Date(result.quotation.validUntil).toLocaleDateString('en-IN')}</span>
                  </p>
                )}
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
                  Authorized Total
                </span>
                <div className="flex items-center gap-2 text-[#7FB706] font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-[#7FB706]" />
                  <span>{result.document?.maskedAmount}</span>
                </div>
                {result.quotation?.amountInWords && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">{result.quotation.amountInWords}</p>
                )}
              </div>
            </div>

            {/* Quotation Itemized Line Items & Specifications Table */}
            {result.quotation && Array.isArray(result.quotation.items) && result.quotation.items.length > 0 && (
              <div className="my-6 border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#7FB706]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Specification & Line Items ({result.quotation.items.length})
                    </h3>
                  </div>
                  {result.quotation.subject && (
                    <span className="text-[11px] text-gray-400 truncate max-w-xs">{result.quotation.subject}</span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">#</th>
                        <th className="py-2.5 px-3 font-semibold">Description / Model</th>
                        <th className="py-2.5 px-3 font-semibold">Board / Size</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Rate</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.quotation.items.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">{item.serialNumber || idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{item.description}</div>
                            {item.hardwarePackage && (
                              <div className="text-[10px] text-gray-400 mt-0.5">Hardware: {item.hardwarePackage}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-gray-400">
                            <div>{item.boardType || 'Standard'} {item.boardThickness ? `(${item.boardThickness})` : ''}</div>
                            {item.cubicleSize && <div className="text-[10px] text-gray-500">{item.cubicleSize}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-white">{item.quantity} {item.unit || 'NOS'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-300">₹ {Number(item.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#7FB706]">₹ {Number(item.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commercial Breakdown Summary */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Freight:</span>
                      <span>{result.quotation.freightTerms || 'Extra at Actuals'}</span>
                      {Number(result.quotation.freightAmount) > 0 && (
                        <span className="font-mono text-white">(₹ {Number(result.quotation.freightAmount).toLocaleString('en-IN')})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Installation:</span>
                      {Number(result.quotation.installationCharge) > 0 ? (
                        <span className="font-mono text-[#7FB706]">₹ {Number(result.quotation.installationCharge).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium text-[10px]">Included / Terms apply</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right font-mono text-xs">
                    <div className="flex justify-between sm:justify-end gap-6 text-gray-400">
                      <span>Basic Supply Price:</span>
                      <span className="text-white">₹ {Number(result.quotation.basicPrice || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-gray-400">
                      <span>GST ({result.quotation.gstRate || 18}%):</span>
                      <span className="text-white">₹ {Number(result.quotation.gstAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-sm font-bold text-white pt-1 border-t border-white/10">
                      <span>Grand Total:</span>
                      <span className="text-[#7FB706]">₹ {Number(result.quotation.grandTotal || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cryptographic Signature Stamp */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-xs space-y-1.5 text-gray-400">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
                <span>Security Token:</span>
                <span className="text-[#7FB706] truncate max-w-[200px]">{token}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Verified At:</span>
                <span className="text-gray-300">
                  {result.document?.verifiedAt
                    ? new Date(result.document.verifiedAt).toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Issuing Authority:</span>
                <span className="text-gray-300">Pacific Restroom Cubicle ERP Core</span>
              </div>
            </div>

            {/* Notice Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-gray-500 text-center">
              This digital certificate confirms this document was officially generated by Pacific Products & Solutions ERP system.
            </div>
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="w-full max-w-4xl py-4 border-t border-white/10 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Pacific Products & Solutions. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="mailto:support@pacificcubicles.com" className="hover:text-gray-300 transition-colors">
            Support
          </a>
          <a href="tel:+919876543210" className="hover:text-gray-300 transition-colors">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
