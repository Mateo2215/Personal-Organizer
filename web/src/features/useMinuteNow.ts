// Współdzielony zegar widoku: zwraca bieżący czas (ms) i odświeża go raz na minutę.
// Pozwala liczyć „za X / X temu" lokalnie, bez requestów do API i bez timera na każdy wiersz.

import { useEffect, useState } from "react";

export function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
