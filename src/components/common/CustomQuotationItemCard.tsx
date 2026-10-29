import React, { useState } from 'react';
import { Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import ModelImageField from '../quotations/ModelImageField';
import { CUSTOM_ITEM_PRESETS, type CustomItemPreset } from './CustomItemPresets';

interface CustomQuotationItemCardProps {
  index: number;
  item: {
    id?: string;
    modelId?: string;
    customModelName?: string;
    modelName?: string;
    modelImageUrl?: string;
    systemCategory?: string;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
    boardType?: string;
    cubicleSize?: string;
    boardColor?: string;
    boardThickness?: string;
    doorSize?: string;
    overallHeight?: string;
    hardwarePackage?: string;
    make?: string;
  };
  fieldErrors?: Record<string, string>;
  onChange: (field: string, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const CustomQuotationItemCard: React.FC<CustomQuotationItemCardProps> = React.memo(({
  index,
  item,
  fieldErrors = {},
  onChange,
  onRemove,
  canRemove,
}) => {
  const [showSpecs, setShowSpecs] = useState(
    Boolean(item.boardType || item.boardThickness || item.boardColor || item.cubicleSize || item.overallHeight || item.hardwarePackage)
  );

  const isLocker = item.systemCategory === 'locker' || (item.description && item.description.toLowerCase().includes('locker'));
  const tierRows = isLocker ? (parseFloat(String(item.unit).replace(/[^0-9.]/g, '')) || 1) : 1;
  const lineTotal = isLocker ? tierRows * (Number(item.quantity) || 0) * (Number(item.rate) || 0) : (Number(item.quantity) || 0) * (Number(item.rate) || 0);

  const handleApplyPreset = (preset: CustomItemPreset) => {
    onChange('customModelName', preset.title);
    onChange('modelName', preset.title);
    if (!item.description || item.description.trim() === '' || item.description === item.customModelName) {
      onChange('description', preset.description);
    }
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
  const inputCls = "w-full bg-[#161536] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors";
  const errorInputCls = "w-full bg-[#161536] border border-red-500/70 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400 transition-colors";

  return (
    <div className="bg-[#0c0c1e] border border-amber-500/35 hover:border-amber-500/60 rounded-xl p-3.5 sm:p-4 space-y-3.5 transition-all shadow-md shadow-amber-950/20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Item #{index + 1}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Custom Item / Specification
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
                className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap"
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

      {/* Row 1: Custom Model Title / Name */}
      <div className="space-y-1">
        <label className={labelCls}>
          Custom Model / Item Name <span className="text-amber-400 font-normal">(Printed on PDF Document)</span> *
        </label>
        <input
          type="text"
          value={item.customModelName || item.modelName || ''}
          onChange={(e) => {
            onChange('customModelName', e.target.value);
            onChange('modelName', e.target.value);
            if (!item.description || item.description === item.customModelName) {
              onChange('description', e.target.value);
            }
          }}
          placeholder="e.g. Designer Restroom Vanity Counter / SS 304 Accessible Grab Bar / Shower Cubicle"
          className={fieldErrors[`item_${index}_desc`] && !item.customModelName ? errorInputCls : inputCls}
          required
        />
      </div>

      {/* Row 2: Detailed Scope / Description */}
      <div className="space-y-1">
        <label className={labelCls}>
          Technical Scope &amp; Detailed Description *
        </label>
        <textarea
          rows={2}
          value={item.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Provide technical description, fabrication details, hardware inclusions, materials, etc..."
          className={fieldErrors[`item_${index}_desc`] && !item.description ? errorInputCls : inputCls}
          required
        />
        {fieldErrors[`item_${index}_desc`] && (
          <p className="text-xs text-red-400">{fieldErrors[`item_${index}_desc`]}</p>
        )}
      </div>

      {/* Visual Image / 3D Model Render */}
      <ModelImageField
        imageUrl={item.modelImageUrl}
        modelName={item.customModelName || item.modelName || 'Custom Item'}
        categoryLabel="Custom Model Visual"
        onImageChange={(newUrl) => onChange('modelImageUrl', newUrl)}
      />

      {/* Row 3: Unit, Qty, Rate, Line Total */}
      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
        <div className="col-span-1 sm:col-span-3 space-y-1">
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

        <div className="col-span-1 sm:col-span-3 space-y-1">
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

        <div className="col-span-1 sm:col-span-3 text-right bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
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
          className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 py-1 cursor-pointer transition-colors"
        >
          {showSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showSpecs ? 'Hide' : 'Add / Edit'} Optional Material, Sizing &amp; Hardware Specifications</span>
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
              <label className={labelCls}>Door / Compartment Size</label>
              <input
                type="text"
                value={item.doorSize || ''}
                onChange={(e) => onChange('doorSize', e.target.value)}
                placeholder="e.g. 600mm × 1785mm"
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>Make / Brand</label>
                <span className="text-[10px] text-gray-400">Pick preset</span>
              </div>
              <input
                type="text"
                value={item.make ?? 'Pacific'}
                onChange={(e) => onChange('make', e.target.value)}
                placeholder="e.g. Pacific"
                className={inputCls}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Pacific', 'Greenlam', 'Merino', 'Stylam', 'Formica'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange('make', preset)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      (item.make ?? 'Pacific') === preset
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Hardware Package</label>
              <input
                type="text"
                value={item.hardwarePackage || ''}
                onChange={(e) => onChange('hardwarePackage', e.target.value)}
                placeholder="e.g. Grade 304 SS Fasteners & Brackets"
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomQuotationItemCard.displayName = 'CustomQuotationItemCard';
