import { useEffect, useRef } from 'react';

/**
 * Hook to detect rapid keyboard input from physical USB / Bluetooth barcode scanners
 * @param {Function} onScan - Callback receiving the scanned barcode string
 * @param {Object} options - { maxIntervalMs: 40, minLength: 5 }
 */
export function useBarcodeScanner(onScan, options = {}) {
  const { maxIntervalMs = 40, minLength = 5 } = options;
  const bufferRef = useRef([]);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    // Audio beep on successful scan using native Web Audio API
    const playScanBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (err) {
        // Audio may be blocked before first user gesture
      }
    };

    const handleKeyDown = (e) => {
      // Don't capture when typing inside a multiline textarea (e.g. clinical notes)
      if (e.target.tagName === 'TEXTAREA') return;

      const now = Date.now();
      const timeDiff = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Enter key marks the end of a barcode scan
      if (e.key === 'Enter') {
        const scannedString = bufferRef.current.join('').trim();
        bufferRef.current = [];

        if (scannedString.length >= minLength) {
          e.preventDefault();
          playScanBeep();
          onScan(scannedString);
        }
        return;
      }

      // If the delta between keystrokes is too long, reset buffer (it's human typing)
      if (timeDiff > maxIntervalMs) {
        bufferRef.current = [];
      }

      // Buffer single printable characters
      if (e.key && e.key.length === 1) {
        bufferRef.current.push(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, maxIntervalMs, minLength]);
}
