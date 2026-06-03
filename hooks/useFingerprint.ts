"use client";

import { useState, useEffect } from 'react';

let fingerprintLoaderPromise: Promise<typeof import('@fingerprintjs/fingerprintjs')> | null = null;

const loadFingerprintModule = () => {
  if (!fingerprintLoaderPromise) {
    fingerprintLoaderPromise = import('@fingerprintjs/fingerprintjs');
  }
  return fingerprintLoaderPromise;
};

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const getFingerprint = async () => {
      try {
        const fingerprintModule = await loadFingerprintModule();
        const fp = await fingerprintModule.default.load();
        const result = await fp.get();
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      } catch {
        if (!cancelled) {
          setFingerprint('');
        }
      }
    };

    void getFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  return fingerprint;
}
