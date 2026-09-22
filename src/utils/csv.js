import Papa from 'papaparse';

// 업로드된 CSV를 표준 OHLCV 레코드 배열로 변환한다.
// 지원 헤더(대소문자/한글 무관): date, open, high, low, close, volume
const HEADER_ALIASES = {
  date: ['date', '날짜', 'time', 'timestamp'],
  open: ['open', '시가'],
  high: ['high', '고가'],
  low: ['low', '저가'],
  close: ['close', 'adj close', 'adjclose', '종가'],
  volume: ['volume', 'vol', '거래량'],
};

function findColumn(fields, aliases) {
  const lower = fields.map((f) => f.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return fields[idx];
  }
  return null;
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        try {
          const fields = results.meta.fields || [];
          const colMap = {};
          for (const key of Object.keys(HEADER_ALIASES)) {
            const col = findColumn(fields, HEADER_ALIASES[key]);
            if (col) colMap[key] = col;
          }
          if (!colMap.date || !colMap.close) {
            reject(new Error('CSV에서 date(날짜)와 close(종가) 컬럼을 찾을 수 없습니다. 헤더를 확인해주세요.'));
            return;
          }

          const rows = results.data
            .map((row) => {
              const close = parseFloat(row[colMap.close]);
              if (!colMap.date || Number.isNaN(close)) return null;
              return {
                date: String(row[colMap.date]).slice(0, 10),
                open: colMap.open ? parseFloat(row[colMap.open]) : close,
                high: colMap.high ? parseFloat(row[colMap.high]) : close,
                low: colMap.low ? parseFloat(row[colMap.low]) : close,
                close,
                volume: colMap.volume ? parseFloat(row[colMap.volume]) || 0 : 0,
              };
            })
            .filter(Boolean)
            .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

          if (rows.length < 30) {
            reject(new Error(`유효한 데이터가 ${rows.length}행뿐입니다. 지표 계산을 위해 최소 30거래일 이상의 데이터가 필요합니다.`));
            return;
          }
          resolve(rows);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}
