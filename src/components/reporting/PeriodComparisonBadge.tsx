import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComparisonResult } from '../../types/admin';

interface PeriodComparisonBadgeProps {
  comparison?: ComparisonResult | null;
  formatter?: (val: number) => string;
  unit?: string;
  invertColors?: boolean; // If true, increase is red (e.g. expenses/payables), decrease is green
  className?: string;
  showPreviousValue?: boolean;
}

export const PeriodComparisonBadge: React.FC<PeriodComparisonBadgeProps> = ({
  comparison,
  formatter = (v) => v.toLocaleString('en-IN'),
  unit = '',
  invertColors = false,
  className = '',
  showPreviousValue = false,
}) => {
  if (!comparison || comparison.previous === 0 && comparison.current === 0) {
    return (
      <span className={`inline-flex items-center text-xs text-slate-400 font-medium ${className}`}>
        <Minus className="w-3.5 h-3.5 mr-1 text-slate-400" />
        <span>No comparison data</span>
      </span>
    );
  }

  const { percentageChange, absoluteDiff, trend, previous } = comparison;

  const isPositive = trend === 'INCREASE';
  const isNeutral = trend === 'NEUTRAL' || percentageChange === null;

  // Color logic
  let textColor = 'text-slate-400';
  let bgColor = 'bg-slate-800/40 border-slate-700/50';

  if (!isNeutral) {
    if ((isPositive && !invertColors) || (!isPositive && invertColors)) {
      textColor = 'text-emerald-400';
      bgColor = 'bg-emerald-950/40 border-emerald-500/20';
    } else {
      textColor = 'text-rose-400';
      bgColor = 'bg-rose-950/40 border-rose-500/20';
    }
  }

  const formattedAbs = `${absoluteDiff > 0 ? '+' : ''}${formatter(absoluteDiff)}${unit ? ' ' + unit : ''}`;
  const formattedPct = percentageChange !== null ? `${percentageChange > 0 ? '+' : ''}${percentageChange}%` : 'N/A';

  return (
    <div className={`inline-flex flex-col sm:flex-row sm:items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${bgColor} ${textColor}`}
        title={`Diff: ${formattedAbs} vs Previous: ${formatter(previous)}${unit ? ' ' + unit : ''}`}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{formattedPct}</span>
        <span className="text-[10px] font-normal opacity-80 hidden md:inline">({formattedAbs})</span>
      </span>

      {showPreviousValue && (
        <span className="text-[11px] text-slate-400 font-normal">
          prev: <span className="text-slate-300 font-medium">{formatter(previous)}{unit ? ' ' + unit : ''}</span>
        </span>
      )}
    </div>
  );
};
