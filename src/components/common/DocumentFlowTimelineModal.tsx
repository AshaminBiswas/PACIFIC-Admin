import React, { useEffect } from 'react';
import { X, Layers, ExternalLink } from 'lucide-react';
import DocumentFlowTimeline, {
  LinkedLifecycleDocs,
  AdvanceLifecycleInfo,
} from './DocumentFlowTimeline';
import { Link } from 'react-router-dom';

export interface DocumentFlowTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  documentRef?: string;
  currentStatus?: string;
  statusDescription?: string;
  linkedDocs?: LinkedLifecycleDocs;
  advanceInfo?: AdvanceLifecycleInfo;
  nextStepTitle?: string;
  nextStepDescription?: string;
  nextStepActionLabel?: string;
  nextStepActionUrl?: string;
  onNextStepAction?: () => void;
  primaryDetailUrl?: string;
}

export const DocumentFlowTimelineModal: React.FC<DocumentFlowTimelineModalProps> = ({
  isOpen,
  onClose,
  title,
  stage,
  documentRef,
  currentStatus,
  statusDescription,
  linkedDocs,
  advanceInfo,
  nextStepTitle,
  nextStepDescription,
  nextStepActionLabel,
  nextStepActionUrl,
  onNextStepAction,
  primaryDetailUrl,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-[#0e0e22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#12122a]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  {documentRef || title}
                </h3>
                {documentRef && (
                  <span className="text-xs text-gray-400 font-medium">({title})</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Lifecycle Stage {stage} of 07 • Bi-Directional Document Progression & Status Guide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {primaryDetailUrl && (
              <Link
                to={primaryDetailUrl}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10 transition-colors"
              >
                <span>Full Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <DocumentFlowTimeline
            currentStage={stage}
            documentRef={documentRef}
            currentStatus={currentStatus}
            statusDescription={statusDescription}
            linkedDocs={linkedDocs}
            advanceInfo={advanceInfo}
            nextStepTitle={nextStepTitle}
            nextStepDescription={nextStepDescription}
            nextStepActionLabel={nextStepActionLabel}
            nextStepActionUrl={nextStepActionUrl}
            onNextStepAction={onNextStepAction}
            showNextStepCard={true}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-[#12122a] flex items-center justify-between text-xs text-gray-400">
          <span className="text-[11px] font-mono text-gray-500">
            Pacific Restroom Cubicle Enterprise Document Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentFlowTimelineModal;
