import { useEffect, useState } from 'react';
import { api } from './api.js';

let cache = null;

/** Form options (quality attributes, project types, ...) served by the API. */
export function useOptions() {
  const [options, setOptions] = useState(cache);
  useEffect(() => {
    if (cache) return;
    api('/options').then((o) => { cache = o; setOptions(o); });
  }, []);
  return options;
}

export const labelOf = (list, key) => list?.find((x) => x.key === key)?.label ?? key;
