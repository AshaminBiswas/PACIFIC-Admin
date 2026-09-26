import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  Layers,
  Receipt,
  Package,
  Truck,
  Wrench,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react';

export interface LinkedLifecycleDocs {
  quotationId?: string;
  quotationRef?: string;
  piId?: string;
  piNumber?: string;
  orderId?: string;
  orderNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  packingListId?: string;
  plNumber?: string;
  issueListId?: string;
  hilNumber?: string;
}

export interface AdvanceLifecycleInfo {
  grandTotal?: number;
  advanceRequired?: number;
  advanceReceived?: number;
  advancePaymentStatus?: string;
}

export interface DocumentFlowTimelineProps {
  currentStage: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  linkedDocs?: LinkedLifecycleDocs;
  advanceInfo?: AdvanceLifecycleInfo;
  className?: string;
  currentStatus?: string;
  statusDescription?: string;
  nextStepTitle?: string;
  nextStepDescription?: string;
  nextStepActionLabel?: string;
  nextStepActionUrl?: string;
  onNextStepAction?: () => void;
  documentRef?: string;
  showNextStepCard?: boolean;
}

const STAGES = [
  {
    stage: 1,
    step: '01',
    name: 'Quotation',
    shortName: 'Quotation',
    icon: FileText,
    basePath: '/admin/dashboard/sales-quotations',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.quotationId ? `/admin/dashboard/sales-quotations/${docs.quotationId}` : null,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.quotationRef,
  },
  {
    stage: 2,
    step: '02',
    name: 'Proforma Invoice (PI)',
    shortName: 'Proforma PI',
    icon: CreditCard,
    basePath: '/admin/dashboard/proforma-invoices',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.piId ? `/admin/dashboard/proforma-invoices/${docs.piId}` : null,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.piNumber,
  },
  {
    stage: 3,
    step: '03',
    name: 'Sales Order Hub',
    shortName: 'Sales Order',
    icon: Layers,
    basePath: '/admin/dashboard/sales-orders',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.orderId ? `/admin/dashboard/sales-orders/${docs.orderId}` : null,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.orderNumber,
  },
  {
    stage: 4,
    step: '04',
    name: 'Bill & Tax Invoice',
    shortName: 'Tax Invoice',
    icon: Receipt,
    basePath: '/admin/dashboard/invoices',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.invoiceId ? `/admin/dashboard/invoices` : `/admin/dashboard/invoices`,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.invoiceNumber,
  },
  {
    stage: 5,
    step: '05',
    name: 'Packing List',
    shortName: 'Packing List',
    icon: Package,
    basePath: '/admin/dashboard/packing-lists',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.packingListId ? `/admin/dashboard/packing-lists` : `/admin/dashboard/packing-lists`,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.plNumber,
  },
  {
    stage: 6,
    step: '06',
    name: 'Dispatch & Gate Pass',
    shortName: 'Dispatch',
    icon: Truck,
    basePath: '/admin/dashboard/dispatches',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.packingListId ? `/admin/dashboard/dispatches?plId=${docs.packingListId}` : `/admin/dashboard/dispatches`,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.plNumber ? `DSP/${docs.plNumber.split('/').pop()}` : undefined,
  },
  {
    stage: 7,
    step: '07',
    name: 'Issue List (HIL)',
    shortName: 'Issue List',
    icon: Wrench,
    basePath: '/admin/dashboard/issue-lists',
    getDetailPath: (docs?: LinkedLifecycleDocs) =>
      docs?.issueListId ? `/admin/dashboard/issue-lists` : `/admin/dashboard/issue-lists`,
    getDocRef: (docs?: LinkedLifecycleDocs) => docs?.hilNumber,
  },
];

interface StageGuide {
  title: string;
  defaultStatus: string;
  statusDesc: string;
  nextStepTitle: string;
  nextStepDesc: string;
  defaultActionLabel: string;
  defaultActionUrl: string;
}

const STAGE_GUIDES: Record<number, StageGuide> = {
  1: {
    title: 'Quotation Proposal',
    defaultStatus: 'APPROVED',
    statusDesc: 'Commercial proposal with specifications, dimensions, board type & hardware selection.',
    nextStepTitle: 'Stage 02: Generate Proforma Invoice (PI) & Request Advance',
    nextStepDesc: 'Once client approves the quotation, issue a Proforma Invoice with 50% advance terms to confirm the booking before factory fabrication.',
    defaultActionLabel: 'Create Proforma Invoice',
    defaultActionUrl: '/admin/dashboard/proforma-invoices/new',
  },
  2: {
    title: 'Proforma Invoice (PI)',
    defaultStatus: 'ADVANCE_PENDING',
    statusDesc: 'Precondition commercial invoice with GST calculations and advance payment tracking.',
    nextStepTitle: 'Stage 03: Collect 50% Advance & Convert to Sales Order',
    nextStepDesc: 'Collect and record client advance payment (50% default) to unlock production scheduling and confirm the official Sales Order.',
    defaultActionLabel: 'View Sales Order Hub',
    defaultActionUrl: '/admin/dashboard/sales-orders',
  },
  3: {
    title: 'Sales Order Hub',
    defaultStatus: 'APPROVED',
    statusDesc: 'Confirmed production order against client PO with manufacturing fabrication terms.',
    nextStepTitle: 'Stage 04: Generate Statutory Tax Invoice & Prepare Packing List',
    nextStepDesc: 'Generate the statutory GST Tax Invoice (CGST/SGST/IGST) and prepare the factory Packing List breakdown for warehouse dispatch.',
    defaultActionLabel: 'Generate Tax Invoice',
    defaultActionUrl: '/admin/dashboard/invoices/new',
  },
  4: {
    title: 'Bill & Tax Invoice',
    defaultStatus: 'ISSUED',
    statusDesc: 'Statutory GST Tax Invoice under CGST/SGST Act with legal jurisdictional terms and payment tracking.',
    nextStepTitle: 'Stage 05: Generate Consignment Packing List',
    nextStepDesc: 'Create the packet breakdown (pilasters, intermediate panels, doors, hardware cartons) for physical consignment verification.',
    defaultActionLabel: 'Generate Packing List',
    defaultActionUrl: '/admin/dashboard/packing-lists/new',
  },
  5: {
    title: 'Packing List',
    defaultStatus: 'READY_FOR_DISPATCH',
    statusDesc: 'BOM packet breakdown with piece counts, weight, and consignee verification protocols.',
    nextStepTitle: 'Stage 06: Create Gate Pass & Outward Dispatch Record',
    nextStepDesc: 'Record transporter details, vehicle number, driver phone, LR/GR number, and E-Way bill for factory gate pass clearance.',
    defaultActionLabel: 'Record Gate Pass',
    defaultActionUrl: '/admin/dashboard/dispatches',
  },
  6: {
    title: 'Dispatch & Gate Pass',
    defaultStatus: 'DISPATCHED',
    statusDesc: 'Consignment departed factory premises under carrier custody with valid E-Way Bill and Gate Pass.',
    nextStepTitle: 'Stage 07: Verify Hardware Store Issue & Consignee Ack',
    nextStepDesc: 'Collect digital delivery receipt signature from site consignee and verify the 44-item Hardware Issue List with sequential installer sign-off.',
    defaultActionLabel: 'View Hardware Issues',
    defaultActionUrl: '/admin/dashboard/issue-lists',
  },
  7: {
    title: 'Hardware Issue List (HIL)',
    defaultStatus: 'IN_SIGN_OFF',
    statusDesc: '44-item cubicle hardware picklist with sequential 4-role installer sign-off protocol.',
    nextStepTitle: 'Stage 07 of 07: Complete 4-Role Sequential Sign-Off',
    nextStepDesc: 'Ensure Store Keeper, Quality Inspector, Site Supervisor, and Project Manager sign-offs are completed for final handover and warranty issuance.',
    defaultActionLabel: 'Manage Sign-Off',
    defaultActionUrl: '/admin/dashboard/issue-lists',
  },
};

export const DocumentFlowTimeline: React.FC<DocumentFlowTimelineProps> = ({
  currentStage,
  linkedDocs,
  advanceInfo,
  className = '',
  currentStatus,
  statusDescription,
  nextStepTitle,
  nextStepDescription,
  nextStepActionLabel,
  nextStepActionUrl,
  onNextStepAction,
  documentRef,
  showNextStepCard = true,
}) => {
  const currentStageMeta = STAGES.find((s) => s.stage === currentStage) || STAGES[0];
  const stageGuide = STAGE_GUIDES[currentStage] || STAGE_GUIDES[1];

  // Dynamic next step computation if not provided explicitly
  let resolvedNextTitle = nextStepTitle || stageGuide.nextStepTitle;
  let resolvedNextDesc = nextStepDescription || stageGuide.nextStepDesc;
  let resolvedNextLabel = nextStepActionLabel || stageGuide.defaultActionLabel;
  let resolvedNextUrl = nextStepActionUrl || stageGuide.defaultActionUrl;

  // Context-aware dynamic updates based on linkedDocs
  if (!nextStepTitle) {
    if (currentStage === 1) {
      if (linkedDocs?.piId) {
        resolvedNextTitle = `Stage 02: Proforma Invoice Issued (${linkedDocs.piNumber || 'View PI'})`;
        resolvedNextDesc = 'Proforma Invoice has been created from this quotation. Track advance payment and order confirmation.';
        resolvedNextLabel = 'View Proforma Invoice';
        resolvedNextUrl = `/admin/dashboard/proforma-invoices/${linkedDocs.piId}`;
      } else if (linkedDocs?.orderId) {
        resolvedNextTitle = `Stage 03: Direct Sales Order Active (${linkedDocs.orderNumber || 'View Order'})`;
        resolvedNextDesc = 'Sales Order has been generated directly from this quotation. Fabrication and dispatch in progress.';
        resolvedNextLabel = 'View Sales Order';
        resolvedNextUrl = `/admin/dashboard/sales-orders/${linkedDocs.orderId}`;
      }
    } else if (currentStage === 2) {
      if (linkedDocs?.orderId) {
        resolvedNextTitle = `Stage 03: Sales Order Active (${linkedDocs.orderNumber || 'View Order'})`;
        resolvedNextDesc = 'Sales Order is confirmed and active in the production hub.';
        resolvedNextLabel = 'View Sales Order';
        resolvedNextUrl = `/admin/dashboard/sales-orders/${linkedDocs.orderId}`;
      }
    } else if (currentStage === 3) {
      if (linkedDocs?.invoiceId && linkedDocs?.packingListId) {
        resolvedNextTitle = 'Stage 06: Ready for Outward Dispatch & Gate Pass';
        resolvedNextDesc = 'GST Invoice & Packing List are ready. Proceed with transporter gate pass clearance.';
        resolvedNextLabel = 'Go to Dispatches';
        resolvedNextUrl = '/admin/dashboard/dispatches';
      } else if (linkedDocs?.invoiceId) {
        resolvedNextTitle = 'Stage 05: Generate Consignment Packing List';
        resolvedNextDesc = 'Tax Invoice issued. Prepare the factory packing list breakdown.';
        resolvedNextLabel = 'Generate Packing List';
        resolvedNextUrl = '/admin/dashboard/packing-lists/new';
      }
    }
  }

  const activeStatus = currentStatus || stageGuide.defaultStatus;
  const activeStatusDesc = statusDescription || stageGuide.statusDesc;

  // List of active linked documents
  const linkedItems = [
    { label: 'Quotation', ref: linkedDocs?.quotationRef, url: linkedDocs?.quotationId ? `/admin/dashboard/sales-quotations/${linkedDocs.quotationId}` : null },
    { label: 'Proforma PI', ref: linkedDocs?.piNumber, url: linkedDocs?.piId ? `/admin/dashboard/proforma-invoices/${linkedDocs.piId}` : null },
    { label: 'Sales Order', ref: linkedDocs?.orderNumber, url: linkedDocs?.orderId ? `/admin/dashboard/sales-orders/${linkedDocs.orderId}` : null },
    { label: 'Tax Invoice', ref: linkedDocs?.invoiceNumber, url: '/admin/dashboard/invoices' },
    { label: 'Packing List', ref: linkedDocs?.plNumber, url: '/admin/dashboard/packing-lists' },
    { label: 'Issue List', ref: linkedDocs?.hilNumber, url: '/admin/dashboard/issue-lists' },
  ].filter((item) => item.ref);

  return (
    <div className={`bg-[#0c0c1e]/90 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur-md shadow-xl space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7FB706] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Document Flow Timeline
          </span>
          <span className="text-gray-600 font-mono text-xs">•</span>
          <span className="text-xs font-mono font-bold text-[#B5F823] bg-[#7FB706]/15 border border-[#7FB706]/30 px-2.5 py-0.5 rounded-full">
            Stage {currentStageMeta.step} of 07: {currentStageMeta.name}
          </span>
          {documentRef && (
            <span className="text-xs font-mono font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              {documentRef}
            </span>
          )}
        </div>

        {/* Advance tracking badge if available for Stage 2 / overall */}
        {advanceInfo && advanceInfo.grandTotal !== undefined && advanceInfo.grandTotal > 0 && (
          <div className="flex items-center gap-2 text-xs bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-xl">
            <span className="text-gray-400 font-medium">Advance:</span>
            <span className="text-emerald-400 font-bold font-mono">
              ₹{(advanceInfo.advanceReceived || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300 font-mono">
              ₹{(advanceInfo.advanceRequired || Math.round(advanceInfo.grandTotal * 0.5)).toLocaleString('en-IN')}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                advanceInfo.advancePaymentStatus === 'FULLY_RECEIVED'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : advanceInfo.advancePaymentStatus === 'PARTIAL'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {advanceInfo.advancePaymentStatus || 'PENDING'}
            </span>
          </div>
        )}
      </div>

      {/* Responsive Stages Track */}
      <div className="relative">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {STAGES.map((s, idx) => {
            const isCurrent = s.stage === currentStage;
            const isCompleted = s.stage < currentStage;
            const detailPath = s.getDetailPath(linkedDocs);
            const docRef = s.getDocRef(linkedDocs);
            const targetPath = detailPath || (isCurrent ? undefined : s.basePath);

            const StepIcon = s.icon;

            const cardContent = (
              <div
                className={`group relative shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-200 ${
                  isCurrent
                    ? 'bg-[#7FB706]/15 border-[#7FB706]/60 text-white shadow-lg shadow-[#7FB706]/20 ring-1 ring-[#7FB706]/40'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-gray-200 hover:border-emerald-500/50 hover:bg-emerald-500/15'
                    : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {/* Step pill */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                    isCurrent
                      ? 'bg-[#7FB706] text-black shadow-md'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                </div>

                {/* Icon */}
                <StepIcon
                  className={`w-4 h-4 shrink-0 ${
                    isCurrent
                      ? 'text-[#B5F823]'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-gray-500 group-hover:text-gray-400'
                  }`}
                />

                {/* Labels */}
                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold truncate text-xs ${isCurrent ? 'text-white' : ''}`}>
                      {s.shortName}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#7FB706] text-black px-1.5 py-0.2 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  {docRef ? (
                    <span className="text-[10px] font-mono text-[#7FB706] truncate">
                      {docRef}
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-500 truncate">
                      {isCurrent ? 'In Progress' : isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  )}
                </div>

                {/* External link indicator if linked to specific doc */}
                {detailPath && !isCurrent && (
                  <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-[#7FB706] shrink-0" />
                )}
              </div>
            );

            return (
              <React.Fragment key={s.stage}>
                {targetPath ? (
                  <Link to={targetPath} title={`Go to ${s.name}`}>
                    {cardContent}
                  </Link>
                ) : (
                  <div>{cardContent}</div>
                )}

                {/* Step Connector Chevron */}
                {idx < STAGES.length - 1 && (
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 ${
                      s.stage < currentStage ? 'text-emerald-500/40' : 'text-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Intelligence Dock: Current Status & What is the Next Step */}
      {showNextStepCard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Card 1: Current Status */}
          <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Current Status
                </span>
                <span className="text-gray-600 font-mono text-xs">•</span>
                <span className="text-[11px] text-gray-300 font-semibold">
                  Stage {currentStageMeta.step}
                </span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  activeStatus.includes('APPROVED') || activeStatus.includes('COMPLETE') || activeStatus.includes('ACKNOWLEDGED') || activeStatus.includes('DISPATCHED')
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : activeStatus.includes('PENDING') || activeStatus.includes('WAITING')
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-[#7FB706]/15 text-[#B5F823] border-[#7FB706]/30'
                }`}
              >
                {activeStatus}
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {activeStatusDesc}
            </p>
            {documentRef && (
              <div className="text-[11px] font-mono text-gray-400 pt-1 border-t border-white/5 flex items-center justify-between">
                <span>Active Ref:</span>
                <span className="text-white font-bold">{documentRef}</span>
              </div>
            )}
          </div>

          {/* Card 2: Next Recommended Step */}
          <div className="bg-gradient-to-br from-[#7FB706]/10 to-transparent border border-[#7FB706]/30 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#B5F823]">
                <Sparkles className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>Next Recommended Step</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 bg-black/30 px-1.5 py-0.5 rounded">
                Action Required
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-white mb-0.5">
                {resolvedNextTitle}
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                {resolvedNextDesc}
              </p>
            </div>

            <div className="pt-1 border-t border-white/5 flex items-center justify-end">
              {onNextStepAction ? (
                <button
                  type="button"
                  onClick={onNextStepAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span>{resolvedNextLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : resolvedNextUrl ? (
                <Link
                  to={resolvedNextUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span>{resolvedNextLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Linked Cross-Document Reference Strip */}
      {linkedItems.length > 0 && (
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            Linked Lifecycle:
          </span>
          {linkedItems.map((item, i) => (
            <React.Fragment key={item.label + i}>
              {item.url ? (
                <Link
                  to={item.url}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2 py-0.5 rounded border border-white/10 transition-colors"
                >
                  <span className="text-gray-500">{item.label}:</span>
                  <span className="font-bold text-[#7FB706]">{item.ref}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                  <span className="text-gray-500">{item.label}:</span>
                  <span className="font-semibold text-gray-300">{item.ref}</span>
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentFlowTimeline;
