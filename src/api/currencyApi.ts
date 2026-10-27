import type {
  ExchangeRateApiResponse,
  CurrencyMetadata,
  ConvertedCurrencyResult,
} from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Real-time Currency Exchange Rate Service (ExchangeRate-API v6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve ExchangeRate-API v6 key dynamically:
 * 1. Environment variable `VITE_EXCHANGERATE_API_KEY` (from .env or Vercel build environment)
 * 2. In-browser `localStorage` key `pacific_forex_api_key` (configured by admin directly in UI)
 */
export function getExchangeRateApiKey(): string {
  const envKey = (import.meta as any).env?.VITE_EXCHANGERATE_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  try {
    const localKey = localStorage.getItem('pacific_forex_api_key');
    if (typeof localKey === 'string' && localKey.trim().length > 0) {
      return localKey.trim();
    }
  } catch {}
  return '';
}

export function setCustomForexApiKey(key: string): void {
  try {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem('pacific_forex_api_key', trimmed);
    } else {
      localStorage.removeItem('pacific_forex_api_key');
    }
  } catch {}
}

export function hasForexApiKey(): boolean {
  return Boolean(getExchangeRateApiKey());
}

const CACHE_KEY_PREFIX = 'pacific_forex_rates_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for optimal API quota & performance

// In-memory cache for ultra-fast component re-renders
const memoryCache = new Map<string, { data: ExchangeRateApiResponse; timestamp: number }>();

export const POPULAR_EXPORT_CURRENCIES = [
  'USD',
  'INR',
  'AED',
  'EUR',
  'GBP',
  'SAR',
  'QAR',
  'OMR',
  'KWD',
  'SGD',
  'AUD',
  'CAD',
  'JPY',
];

export const WORLD_CURRENCIES: CurrencyMetadata[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', country: 'United States' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', country: 'India' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', country: 'United Arab Emirates' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', country: 'United Kingdom' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', country: 'Saudi Arabia' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', flag: '🇶🇦', country: 'Qatar' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', flag: '🇴🇲', country: 'Oman' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', country: 'Kuwait' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭', country: 'Bahrain' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', country: 'Singapore' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', country: 'Australia' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', country: 'Canada' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', country: 'Japan' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', country: 'China' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', country: 'Switzerland' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', country: 'New Zealand' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', country: 'South Africa' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', country: 'Malaysia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', country: 'Thailand' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', country: 'Indonesia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', country: 'Philippines' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', country: 'Vietnam' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', country: 'South Korea' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', country: 'Brazil' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', country: 'Mexico' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', country: 'Turkey' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', country: 'Russia' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', country: 'Egypt' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', country: 'Kenya' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', country: 'Nigeria' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰', country: 'Sri Lanka' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', country: 'Bangladesh' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', flag: '🇳🇵', country: 'Nepal' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', flag: '🇵🇰', country: 'Pakistan' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', country: 'Hong Kong' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', country: 'Taiwan' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', country: 'Sweden' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', country: 'Norway' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', country: 'Denmark' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', country: 'Poland' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', flag: '🇮🇱', country: 'Israel' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱', country: 'Chile' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴', country: 'Colombia' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪', country: 'Peru' },
];

export const currencyMetaMap: Record<string, CurrencyMetadata> = WORLD_CURRENCIES.reduce(
  (acc, curr) => {
    acc[curr.code] = curr;
    return acc;
  },
  {} as Record<string, CurrencyMetadata>
);

export function getCurrencyMeta(code: string): CurrencyMetadata {
  const upper = (code || '').toUpperCase().trim();
  if (currencyMetaMap[upper]) {
    return currencyMetaMap[upper];
  }
  return {
    code: upper,
    name: upper,
    symbol: upper,
    flag: '🌐',
    country: 'International',
  };
}

export const currencyApi = {
  /**
   * Fetch exchange rates against base currency (default USD).
   */
  async getExchangeRates(
    baseCurrency = 'USD',
    forceRefresh = false
  ): Promise<ExchangeRateApiResponse> {
    const base = (baseCurrency || 'USD').toUpperCase().trim();
    const cacheKey = `${CACHE_KEY_PREFIX}${base}`;

    // 1. Check in-memory cache
    if (!forceRefresh) {
      const mem = memoryCache.get(base);
      if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
        return mem.data;
      }

      // 2. Check localStorage
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(base, { data: parsed.data, timestamp: parsed.timestamp });
            return parsed.data;
          }
        }
      } catch {}
    }

    // 3. Resolve API key
    const apiKey = getExchangeRateApiKey();
    if (!apiKey) {
      // Graceful fallback to existing stored cache if available
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.data && parsed.data.conversion_rates) {
            memoryCache.set(base, { data: parsed.data, timestamp: parsed.timestamp || Date.now() });
            return parsed.data;
          }
        }
      } catch {}
      throw new Error(
        'ExchangeRate-API key is not configured. Please set VITE_EXCHANGERATE_API_KEY in your .env or configure in the Forex Desk.'
      );
    }

    // 4. Fetch from ExchangeRate-API
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        throw new Error(
          'Forex API error: 403 Forbidden (API key inactive or invalid). Please enter your active key via "Set API Key" or set VITE_EXCHANGERATE_API_KEY.'
        );
      }
      throw new Error(`Forex API error: ${res.status} ${res.statusText}`);
    }

    const data: ExchangeRateApiResponse = await res.json();
    if (data.result !== 'success' || !data.conversion_rates) {
      const errType = (data as any)['error-type'] || 'Failed to fetch forex rates';
      throw new Error(typeof errType === 'string' ? errType : JSON.stringify(errType));
    }

    // Update caches
    const now = Date.now();
    memoryCache.set(base, { data, timestamp: now });
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: now }));
    } catch {}

    return data;
  },

  /**
   * Calculate conversion between any two currencies.
   */
  async convertCurrency(
    amount: number,
    from: string,
    to: string,
    forceRefresh = false
  ): Promise<ConvertedCurrencyResult> {
    const fromCode = (from || 'USD').toUpperCase().trim();
    const toCode = (to || 'INR').toUpperCase().trim();
    const numAmount = Number(amount) || 0;

    if (fromCode === toCode) {
      return {
        from: fromCode,
        to: toCode,
        amount: numAmount,
        result: numAmount,
        rate: 1,
        inverseRate: 1,
        lastUpdated: new Date().toUTCString(),
      };
    }

    const data = await currencyApi.getExchangeRates(fromCode, forceRefresh);
    const rate = data.conversion_rates[toCode];

    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCode} to ${toCode}`);
    }

    const inverseRate = rate !== 0 ? 1 / rate : 0;
    const result = Number((numAmount * rate).toFixed(4));

    return {
      from: fromCode,
      to: toCode,
      amount: numAmount,
      result,
      rate,
      inverseRate: Number(inverseRate.toFixed(4)),
      lastUpdated: data.time_last_update_utc,
    };
  },

  /**
   * Get direct exchange rate for a pair (From -> To).
   */
  async getPairRate(from: string, to: string, forceRefresh = false): Promise<number> {
    const res = await currencyApi.convertCurrency(1, from, to, forceRefresh);
    return res.rate;
  },

  /**
   * Get key export market rates relative to INR.
   */
  async getExportMarketRates(base = 'INR', forceRefresh = false) {
    const data = await currencyApi.getExchangeRates(base, forceRefresh);
    const rates = data.conversion_rates || {};

    const majorExportCurrencies = [
      'USD',
      'EUR',
      'AED',
      'GBP',
      'SAR',
      'QAR',
      'KWD',
      'OMR',
      'SGD',
      'AUD',
      'CAD',
      'JPY',
    ];

    return majorExportCurrencies.map((code) => {
      const rawRate = rates[code] || 0;
      // Invert if base is INR: 1 Foreign Currency = X INR
      const rateToInr = rawRate > 0 ? 1 / rawRate : 0;
      const meta = getCurrencyMeta(code);

      return {
        code,
        name: meta.name,
        symbol: meta.symbol,
        flag: meta.flag,
        rateToInr: Number(rateToInr.toFixed(4)),
        inrToForeign: Number(rawRate.toFixed(4)),
      };
    });
  },

  /**
   * Return full list of supported currencies.
   */
  getAllCurrencies(): CurrencyMetadata[] {
    return WORLD_CURRENCIES;
  },

  /**
   * Clear local forex cache.
   */
  clearCache() {
    memoryCache.clear();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  },
};
