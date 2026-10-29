import React, { useState } from 'react';
import { Trash2, Sparkles, ChevronDown, ChevronUp, Layers, Wrench, Shield, Check } from 'lucide-react';
import HsnSelectInput from './HsnSelectInput';
import { CUSTOM_ITEM_PRESETS, type CustomItemPreset } from './CustomItemPresets';
import type { CreateItem } from '../../pages/CreateProformaPage';

interface CustomPiItemCardProps {
  index: number;
  item: CreateItem;
  fieldErrors?: Record<string, string>;
  onChange: (field: keyof CreateItem, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const CustomPiItemCard: React.FC<CustomPiItemCardProps> = React.memo(({
  index,
  item,
  fieldErrors = {},
  onChange,
  onRemove,
  canRemove,
}) => {
  const [showSpecs, setShowSpecs] = useState(
    Boolean(item.boardType || item.boardThickness || item.boardColor || item.cubicleSize || item.overallHeight || item.hardwarePackage || item.doorSize || item.make)
  );

  const isLocker = item.systemCategory === 'locker' || (item.description && item.description.toLowerCase().includes('locker'));
  const tierRows = isLocker ? (parseFloat(String(item.unit).replace(/[^0-9.]/g, '')) || 1) : 1;
  const lineTotal = isLocker ? tierRows * (Number(item.quantity) || 0) * (Number(item.rate) || 0) : (Number(item.quantity) || 0) * (Number(item.rate) || 0);

  const handleApplyPreset = (preset: CustomItemPreset) => {
    onChange('customModelName', preset.title);
    if (!item.description || item.description.trim() === '' || item.description === item.customModelName) {
      onChange('description', preset.description);
    }
    onChange('hsnSac', preset.hsnSac);
    onChange('unit', preset.unit);
    if (preset.boardType) onChange('boardType', preset.boardType);
    if (preset.boardThickness) onChange('boardThickness', preset.boardThickness);
    if (preset.cubicleSize) onChange('cubicleSize', preset.cubicleSize);
    if (preset.doorSize) onChange('doorSize', preset.doorSize);
    if (preset.overallHeight) onChange('overallHeight', preset.overallHeight);
    if (preset.hardwarePackage) onChange('hardwarePackage', preset.hardwarePackage);
    setShowSpecs(true);
  };

  const labelCls = "block text-[11px] font-semibold text-gray-400 mb-1";
  const inputCls = "w-full bg-[#161536] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition-colors";
  const errorInputCls = "w-full bg-[#161536] border border-red-500/70 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400 transition-colors";

  return (
    <div className="bg-[#0c0c1e] border border-indigo-500/30 hover:border-indigo-500/50 rounded-xl p-3.5 sm:p-4 space-y-3.5 transition-all shadow-md shadow-indigo-950/20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-indigo-500/20">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Item #{index + 1}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Custom Item / Specification
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Quick preset chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar max-w-full">
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap hidden md:inline">Presets:</span>
            {CUSTOM_ITEM_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-[10px] font-semibold px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors cursor-pointer whitespace-nowrap"
                title={`Click to auto-fill with ${p.title}`}
              >
                + {p.label}
              </button>
            ))}
          </div>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors shrink-0 ml-1"
              title="Remove Custom Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Title & HSN */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 space-y-1">
          <label className={labelCls}>
            Custom Item Title / Heading <span className="text-indigo-400 font-normal">(Printed on PDF)</span> *
          </label>
          <input
            type="text"
            value={item.customModelName || ''}
            onChange={(e) => {
              onChange('customModelName', e.target.value);
              if (!item.description || item.description === item.customModelName) {
                onChange('description', e.target.value);
              }
            }}
            placeholder="e.g. Designer Restroom Vanity Counter / SS 304 Accessible Grab Bar"
            className={fieldErrors[`item_${index}_desc`] && !item.customModelName ? errorInputCls : inputCls}
            required
          />
        </div>

        <div className="sm:col-span-4 space-y-1">
          <label className={labelCls}>HSN / SAC Code</label>
          <HsnSelectInput
            value={item.hsnSac || '9403'}
            onChange={(val) => onChange('hsnSac', val)}
            options={['9403', '8302', '7610', '4823', '7007', '995469', '996511']}
          />
        </div>
      </div>

      {/* Row 2: Detailed Scope / Description */}
      <div className="space-y-1">
        <label className={labelCls}>
          Item Description &amp; Technical Scope of Work *
        </label>
        <textarea
          rows={2}
          value={item.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Provide detailed technical specifications, scope of supply, materials, and workmanship..."
          className={fieldErrors[`item_${index}_desc`] && !item.description ? errorInputCls : inputCls}
          required
        />
        {fieldErrors[`item_${index}_desc`] && (
          <p className="text-xs text-red-400">{fieldErrors[`item_${index}_desc`]}</p>
        )}
      </div>

      {/* Row 3: Unit, Qty, Rate, GST, Line Total */}
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className={labelCls}>Unit</label>
          <select
            value={item.unit || 'NOS'}
            onChange={(e) => onChange('unit', e.target.value)}
            className={inputCls}
          >
            {['NOS', 'SET', 'SQFT', 'SQM', 'RMT', 'PAIR', 'PCS', 'LOT', 'JOB', 'CUBICLE', 'KG', 'MTR'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className={labelCls}>Quantity *</label>
          <input
            type="number"
            min="0.01"
            step="any"
            value={item.quantity}
            onChange={(e) => onChange('quantity', Number(e.target.value) || 0)}
            className={fieldErrors[`item_${index}_qty`] ? errorInputCls : inputCls}
            inputMode="decimal"
            required
          />
        </div>

        <div className="col-span-1 sm:col-span-3 space-y-1">
          <label className={labelCls}>Unit Rate (₹) *</label>
          <input
            type="number"
            min="0"
            step="any"
            value={item.rate}
            onChange={(e) => onChange('rate', Number(e.target.value) || 0)}
            className={fieldErrors[`item_${index}_rate`] ? errorInputCls : inputCls}
            inputMode="decimal"
            required
          />
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className={labelCls}>GST %</label>
          <select
            value={item.gstRate ?? 18}
            onChange={(e) => onChange('gstRate', Number(e.target.value) || 18)}
            className={inputCls}
          >
            {[18, 12, 5, 28, 0].map((rate) => (
              <option key={rate} value={rate}>{rate}%</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 sm:col-span-3 text-right bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
          <span className="text-[10px] text-gray-400 block uppercase tracking-wider font-semibold">Line Amount</span>
          <span className="font-bold text-white text-sm font-mono">
            ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Optional Technical Specifications Accordion */}
      <div className="pt-1 border-t border-white/5">
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 py-1 cursor-pointer transition-colors"
        >
          {showSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showSpecs ? 'Hide' : 'Add / Edit'} Optional Material &amp; Dimension Specifications</span>
        </button>

        {showSpecs && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5">
            <div>
              <label className={labelCls}>Material / Core Type</label>
              <input
                type="text"
                value={item.boardType || ''}
                onChange={(e) => onChange('boardType', e.target.value)}
                placeholder="e.g. HPL Compact / SS 304 / Toughened Glass"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Thickness</label>
              <input
                type="text"
                value={item.boardThickness || ''}
                onChange={(e) => onChange('boardThickness', e.target.value)}
                placeholder="e.g. 12mm / 18mm / 1.5mm"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Color / Shade / Finish</label>
              <input
                type="text"
                value={item.boardColor || ''}
                onChange={(e) => onChange('boardColor', e.target.value)}
                placeholder="e.g. Satin / Matte Black / Oyster White"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Dimensions / Size</label>
              <input
                type="text"
                value={item.cubicleSize || ''}
                onChange={(e) => onChange('cubicleSize', e.target.value)}
                placeholder="e.g. 1800mm W × 600mm D × 750mm H"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Overall Height</label>
              <input
                type="text"
                value={item.overallHeight || ''}
                onChange={(e) => onChange('overallHeight', e.target.value)}
                placeholder="e.g. 1980mm / 2000mm"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Door Size (if applicable)</label>
              <input
                type="text"
                value={item.doorSize || ''}
                onChange={(e) => onChange('doorSize', e.target.value)}
                placeholder="e.g. 600mm × 1785mm"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Brand / Make</label>
              <input
                type="text"
                value={item.make || ''}
                onChange={(e) => onChange('make', e.target.value)}
                placeholder="e.g. Pacific / Merino / Greenlam"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Hardware / Fittings Package</label>
              <input
                type="text"
                value={item.hardwarePackage || ''}
                onChange={(e) => onChange('hardwarePackage', e.target.value)}
                placeholder="e.g. Grade 304 SS Heavy Duty Concealed Brackets & Fasteners"
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomPiItemCard.displayName = 'CustomPiItemCard';
