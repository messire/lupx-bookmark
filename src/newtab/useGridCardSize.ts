import { useState, useEffect } from "react";

const PADDING = 40; // matches .grid padding in CSS
const GAP = 12;     // matches .grid gap in CSS
const RATIO = 4 / 3; // card aspect ratio width:height

function calculate(cols: number, rows: number): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Max card width constrained by viewport width
  const byWidth = (vw - 2 * PADDING - (cols - 1) * GAP) / cols;

  // Max card width constrained by viewport height (via aspect ratio)
  const byHeight = ((vh - 2 * PADDING - (rows - 1) * GAP) / rows) * RATIO;

  return Math.max(40, Math.floor(Math.min(byWidth, byHeight)));
}

/**
 * Returns the optimal card width (px) so that all cards fit on screen
 * without scrolling, maintaining the 4:3 aspect ratio.
 * Recalculates on window resize.
 */
export function useGridCardSize(cols: number, rows: number): number {
  const [cardWidth, setCardWidth] = useState(() => calculate(cols, rows));

  useEffect(() => {
    function update() {
      setCardWidth(calculate(cols, rows));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [cols, rows]);

  return cardWidth;
}
