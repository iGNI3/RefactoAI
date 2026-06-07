import { useState, useEffect } from "react";

/**
 * Custom hook that types out text character-by-character.
 *
 * @param targetText  The full string to type out.
 * @param typingSpeedMs  Milliseconds between characters (default 38).
 * @param startDelayMs  Delay before typing begins (default 600).
 */
export function useTypewriter(
  targetText: string,
  typingSpeedMs: number = 38,
  startDelayMs: number = 600
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let currentIdx = 0;
    let typingTimer: ReturnType<typeof setInterval> | null = null;

    const startTimer = setTimeout(() => {
      typingTimer = setInterval(() => {
        if (currentIdx < targetText.length) {
          setDisplayedText((prev) => prev + targetText.charAt(currentIdx));
          currentIdx++;
        } else {
          setIsDone(true);
          if (typingTimer) clearInterval(typingTimer);
        }
      }, typingSpeedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (typingTimer) clearInterval(typingTimer);
    };
  }, [targetText, typingSpeedMs, startDelayMs]);

  return { displayedText, isDone };
}
