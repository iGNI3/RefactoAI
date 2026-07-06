import { useState, useEffect, useRef } from "react";

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
  const currentIdxRef = useRef(0);

  useEffect(() => {
    if (targetText.length < currentIdxRef.current) {
        currentIdxRef.current = 0;
        setDisplayedText("");
    }

    let typingTimer: ReturnType<typeof setInterval> | null = null;

    const startTimer = setTimeout(() => {
      typingTimer = setInterval(() => {
        if (currentIdxRef.current < targetText.length) {
          setDisplayedText((prev) => prev + targetText.charAt(currentIdxRef.current));
          currentIdxRef.current++;
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
