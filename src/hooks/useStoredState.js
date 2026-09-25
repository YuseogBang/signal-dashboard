import { useCallback, useRef, useState } from 'react';
// State setters resolve against a ref so consecutive edits cannot overwrite one another.
export default function useStoredState(key, fallback) {
  const [error, setError] = useState('');
  const [value, setValue] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v?.version === 1 && v.value && typeof v.value === 'object' ? v.value : fallback; }
    catch { return fallback; }
  });
  const current = useRef(value);
  const update = useCallback(next => {
    const resolved = typeof next === 'function' ? next(current.current) : next;
    try { localStorage.setItem(key, JSON.stringify({ version: 1, value: resolved })); setError(''); }
    catch { setError('브라우저에 저장하지 못했습니다. 이 화면을 닫으면 이번 변경이 사라질 수 있습니다.'); }
    current.current = resolved;
    setValue(resolved);
  }, [key]);
  return [value, update, error];
}
