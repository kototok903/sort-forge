import { useRef, useEffect } from "react";
import type { IRenderer } from "@/renderer/types";
import { cn } from "@/lib/utils";

interface CanvasProps {
  renderer: IRenderer;
  onResize: () => void;
  className?: string;
}

export function Canvas({ renderer, onResize, className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderer.setCanvas(canvas);
    const handleResize = () => {
      renderer.resize();
      onResize();
    };
    // Observe layout changes too, including each frame of sidebar transitions.
    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [renderer, onResize]);
  return (
    <canvas
      ref={canvasRef}
      data-playback-surface
      tabIndex={-1}
      aria-label="Sorting visualization"
      className={cn("block size-full outline-none", className)}
    />
  );
}
