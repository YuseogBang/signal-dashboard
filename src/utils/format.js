// Intl 기반 숫자/통화 포맷 유틸 (하드코딩된 포맷 대신 로케일 인식 포맷 사용)

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const krwCompactFormatter = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 0,
});

export function formatPrice(value, currency) {
  if (value == null || Number.isNaN(value)) return '—';
  return currency === 'USD' ? usdFormatter.format(value) : krwFormatter.format(value);
}

/** 축 눈금처럼 좁은 공간에 쓰는 축약 표기 */
export function formatPriceCompact(value, currency) {
  if (value == null || Number.isNaN(value)) return '—';
  if (currency === 'USD') return usdCompactFormatter.format(value);
  return `₩${krwCompactFormatter.format(value)}`;
}

const percentFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'never',
});

export function formatPercentAbs(fraction) {
  if (fraction == null || Number.isNaN(fraction)) return '—';
  return percentFormatter.format(Math.abs(fraction));
}

const decimal1 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const decimal2 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatDecimal1(v) {
  return v == null || Number.isNaN(v) ? '—' : decimal1.format(v);
}
export function formatDecimal2(v) {
  return v == null || Number.isNaN(v) ? '—' : decimal2.format(v);
}
