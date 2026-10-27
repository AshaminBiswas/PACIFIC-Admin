import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  ArrowRightLeft,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Globe,
  Sliders,
  DollarSign,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  currencyApi,
  WORLD_CURRENCIES,
  POPULAR_EXPORT_CURRENCIES,
  getCurrencyMeta,
  getExchangeRateApiKey,
  setCustomForexApiKey,
  hasForexApiKey,
} from '../../api/currencyApi';
import { Key } from 'lucide-react';
import type { ConvertedCurrencyResult } from '../../types/admin';

export interface RealtimeCurrencyConverterProps {
  initialFrom?: string;
  initialTo?: string;
  initialAmount?: number;
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: number;
  title?: string;
  className?: string;
  onRateApplied?: (result: ConvertedCurrencyResult) => void;
  onApplyRate?: (from: string, to: string, rate: number) => void;
  showApplyButton?: boolean;
}

export const RealtimeCurrencyConverter: React.FC<RealtimeCurrencyConverterProps> = ({
  initialFrom,
  initialTo,
  initialAmount,
  defaultFrom,
  defaultTo,
  defaultAmount,
  title = 'Real-Time Forex & Currency Converter',
  className = '',
  onRateApplied,
  onApplyRate,
  showApplyButton,
}) => {
  const fromInitial = defaultFrom || initialFrom || 'USD';
  const toInitial = defaultTo || initialTo || 'INR';
  const amountInitial = defaultAmount ?? initialAmount ?? 1000;

  const [fromCurrency, setFromCurrency] = useState(fromInitial);
  const [toCurrency, setToCurrency] = useState(toInitial);
  const [amount, setAmount] = useState<number | string>(amountInitial);
  const shouldShowApply = showApplyButton !== undefined ? showApplyButton : Boolean(onRateApplied || onApplyRate);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConvertedCurrencyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(() => hasForexApiKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getExchangeRateApiKey());

  const handleSaveApiKey = () => {
    setCustomForexApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setShowKeyConfig(false);
    performConversion(true);
    loadMarketRates(true);
  };

  const handleClearApiKey = () => {
    setCustomForexApiKey('');
    setApiKeyInput('');
    setHasApiKey(hasForexApiKey());
  };

  // Bank spread / Forex margin calculator
  const [showMarginCalc, setShowMarginCalc] = useState(false);
  const [bankMarginPercent, setBankMarginPercent] = useState<number>(0.25); // typical 0.25% AD bank spread

  // Market board rates
  const [marketRates, setMarketRates] = useState<
    Array<{
      code: string;
      name: string;
      symbol: string;
      flag: string;
      rateToInr: number;
      inrToForeign: number;
    }>
  >([]);
  const [loadingMarket, setLoadingMarket] = useState(false);

  // Convert whenever inputs change
  const performConversion = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const num = Number(amount) || 0;
      const res = await currencyApi.convertCurrency(num, fromCurrency, toCurrency, forceRefresh);
      setConversionResult(res);
      setLastUpdated(res.lastUpdated);
    } catch (err: any) {
      console.error('Forex conversion error:', err);
      setError(err.message || 'Failed to fetch real-time exchange rate');
    } finally {
      setLoading(false);
    }
  };

  // Load market rates against INR
  const loadMarketRates = async (forceRefresh = false) => {
    try {
      setLoadingMarket(true);
      const rates = await currencyApi.getExportMarketRates('INR', forceRefresh);
      setMarketRates(rates);
    } catch (err) {
      console.warn('Failed to load market rates:', err);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    performConversion();
  }, [fromCurrency, toCurrency, amount]);

  useEffect(() => {
    loadMarketRates();
  }, []);

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleCopy = () => {
    if (!conversionResult) return;
    const textToCopy = `${conversionResult.result.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} ${toCurrency}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fromMeta = useMemo(() => getCurrencyMeta(fromCurrency), [fromCurrency]);
  const toMeta = useMemo(() => getCurrencyMeta(toCurrency), [toCurrency]);

  // Bank realized amount after margin deduction
  const bankRealizedAmount = useMemo(() => {
    if (!conversionResult) return 0;
    const raw = conversionResult.result;
    const deduction = raw * (bankMarginPercent / 100);
    return Math.max(0, raw - deduction);
  }, [conversionResult, bankMarginPercent]);

  return (
    <div
      className={`bg-gradient-to-br from-[#0c0b20] via-[#070714] to-[#0c0b20] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <Coins className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {title}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live API
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Institutional real-time mid-market rates for Indian Export &amp; AD Bank Realization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastUpdated && (
            <span className="text-[11px] text-gray-400 font-mono hidden md:inline">
              Rate: {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowKeyConfig((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 min-h-[38px] cursor-pointer ${
              hasApiKey
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 animate-pulse'
            }`}
            title="Configure ExchangeRate-API Key"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{hasApiKey ? 'API Key' : 'Set API Key'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              performConversion(true);
              loadMarketRates(true);
            }}
            disabled={loading || loadingMarket}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50 min-h-[38px] cursor-pointer"
            title="Fetch Fresh Real-Time Rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dynamic API Key Configuration Panel */}
      {(showKeyConfig || !hasApiKey) && (
        <div className="bg-gradient-to-r from-amber-950/30 via-[#120d20] to-black/60 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <Key className="w-4 h-4 text-amber-400" />
              <span>ExchangeRate-API Key Configuration</span>
            </div>
            {hasApiKey && (
              <button
                type="button"
                onClick={() => setShowKeyConfig(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            Rates are fetched dynamically from ExchangeRate-API. Enter your API key below or set <code className="text-amber-300 font-mono">VITE_EXCHANGERATE_API_KEY</code> in your environment file.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste rotated ExchangeRate-API Key here"
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Save Key</span>
            </button>
            {apiKeyInput && (
              <button
                type="button"
                onClick={handleClearApiKey}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-red-400 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Converter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: Amount & From Currency (5 Cols) */}
        <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>YOU SEND / REALIZING</span>
            <span className="text-[#7FB706]">Base Currency</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#070714] border border-white/10 rounded-xl px-3.5 py-3 text-lg sm:text-xl font-bold text-white focus:outline-none focus:border-[#7FB706] transition"
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full bg-[#070714] border border-white/10 rounded-xl px-3 py-3 text-xs sm:text-sm font-bold text-white appearance-none cursor-pointer focus:outline-none focus:border-[#7FB706] transition pr-8"
              >
                {WORLD_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#0a0a1a]">
                    {c.flag} {c.code} - {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base">{fromMeta.flag}</span>
              <span className="font-semibold text-gray-200">{fromMeta.name}</span>
            </span>
            <span className="font-mono text-[11px] text-gray-500">{fromMeta.symbol}</span>
          </div>
        </div>

        {/* Center: Swap Button (2 Cols) */}
        <div className="lg:col-span-2 flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7FB706]/20 to-[#B5F823]/10 hover:from-[#7FB706] hover:to-[#B5F823] text-[#7FB706] hover:text-[#030213] border border-[#7FB706]/40 flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#7FB706]/10 active:scale-90 group"
            title="Swap Currencies"
          >
            <ArrowRightLeft className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        </div>

        {/* Right: Converted Amount & To Currency (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#7FB706]/10 via-black/40 to-transparent border border-[#7FB706]/30 rounded-2xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[#B5F823]">CONVERTED / RECEIVED</span>
            <span className="text-gray-400 font-mono text-[11px]">
              {conversionResult ? `1 ${fromCurrency} = ${conversionResult.rate} ${toCurrency}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 bg-[#070714] border border-[#7FB706]/40 rounded-xl px-3.5 py-3 min-h-[50px] flex items-center justify-between">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-[#7FB706]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Calculating...</span>
                </div>
              ) : (
                <span className="text-lg sm:text-xl font-black text-[#B5F823] truncate font-mono">
                  {conversionResult
                    ? conversionResult.result.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })
                    : '0.00'}
                </span>
              )}

              <button
                type="button"
                onClick={handleCopy}
                disabled={!conversionResult}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition active:scale-90 ml-2 shrink-0"
                title="Copy Value"
              >
                {copied ? <Check className="w-4 h-4 text-[#7FB706]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full bg-[#070714] border border-[#7FB706]/40 rounded-xl px-3 py-3 text-xs sm:text-sm font-bold text-white appearance-none cursor-pointer focus:outline-none focus:border-[#7FB706] transition pr-8"
              >
                {WORLD_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#0a0a1a]">
                    {c.flag} {c.code} - {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base">{toMeta.flag}</span>
              <span className="font-semibold text-gray-200">{toMeta.name}</span>
            </span>
            <span className="font-mono text-[11px] text-[#7FB706]">{toMeta.symbol}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Currency Selector Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
          Quick Export Currency Selectors
        </span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {POPULAR_EXPORT_CURRENCIES.map((code) => {
            const meta = getCurrencyMeta(code);
            const isFrom = fromCurrency === code;
            const isTo = toCurrency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (fromCurrency === code) {
                    setToCurrency('INR');
                  } else {
                    setFromCurrency(code);
                    setToCurrency('INR');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isFrom
                    ? 'bg-[#7FB706] text-[#030213] border-[#7FB706] shadow-md shadow-[#7FB706]/20'
                    : isTo
                    ? 'bg-[#B5F823]/20 text-[#B5F823] border-[#B5F823]/40'
                    : 'bg-white/5 text-gray-300 hover:text-white border-white/10 hover:border-white/20'
                }`}
              >
                <span>{meta.flag}</span>
                <span>{code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversion Rate Readout & Action Bar */}
      {conversionResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black/30 border border-white/5 rounded-2xl text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-gray-400">Direct Rate:</span>
              <span className="text-white font-bold">
                1 {fromCurrency} = {conversionResult.rate} {toCurrency}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Inverse:</span>
              <span className="text-gray-300">
                1 {toCurrency} = {conversionResult.inverseRate} {fromCurrency}
              </span>
            </div>
            <p className="text-[10px] text-gray-500">
              ExchangeRate-API live benchmark feed • Updated{' '}
              {conversionResult.lastUpdated || 'Today'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMarginCalc(!showMarginCalc)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition"
            >
              <Sliders className="w-3.5 h-3.5 text-[#7FB706]" />
              <span>{showMarginCalc ? 'Hide Bank Margin' : 'AD Bank Spread'}</span>
            </button>

            {shouldShowApply && conversionResult && (
              <button
                type="button"
                onClick={() => {
                  if (onRateApplied) onRateApplied(conversionResult);
                  if (onApplyRate) onApplyRate(conversionResult.from, conversionResult.to, conversionResult.rate);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Apply Rate</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Optional: AD Bank Forex Margin / Spread Estimator */}
      {showMarginCalc && conversionResult && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-black/40 to-transparent border border-amber-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Sliders className="w-4 h-4" />
              <span>Authorised Dealer (AD) Bank Realization Margin Calculator</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              Assumed Margin: {bankMarginPercent}%
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            AD banks (HDFC, SBI, ICICI, Axis) apply a forex conversion spread (typically 0.15% to 0.50%) upon Nostro inward remittance credit.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {[0.15, 0.25, 0.35, 0.5, 0.75].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setBankMarginPercent(pct)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                  bankMarginPercent === pct
                    ? 'bg-amber-500 text-black border-amber-500 font-bold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20'
                }`}
              >
                {pct}% Spread
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-gray-400 block mb-0.5">Estimated Bank Forex Spread</span>
              <span className="text-amber-400 font-mono font-bold">
                - {toMeta.symbol}{' '}
                {(conversionResult.result * (bankMarginPercent / 100)).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-[#7FB706]/30">
              <span className="text-[#7FB706] block mb-0.5 font-bold">
                Estimated Net Bank Credit (Inward Remittance)
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                {toMeta.symbol}{' '}
                {bankRealizedAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Export Forex Market Rates Board */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#7FB706]" />
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Major Export Currencies vs INR (₹)
            </h4>
          </div>
          <span className="text-[10px] text-gray-500">Click any card to calculate</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {marketRates.map((item) => {
            const isSelected = fromCurrency === item.code && toCurrency === 'INR';
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setFromCurrency(item.code);
                  setToCurrency('INR');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#7FB706]/15 border-[#7FB706] shadow-lg shadow-[#7FB706]/10 scale-[1.02]'
                    : 'bg-black/30 hover:bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{item.flag}</span>
                  <span className="text-[10px] font-mono text-gray-400">{item.code}/INR</span>
                </div>
                <div className="text-sm font-black text-white font-mono">
                  ₹{item.rateToInr.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RealtimeCurrencyConverter;
