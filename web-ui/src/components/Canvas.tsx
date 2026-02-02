import { useRef, useEffect } from "react";
import type { IRenderer } from "@/renderer/types";

interface CanvasProps {
  renderer: IRenderer;
  className?: string;
}

/**
 * Canvas component that hosts the visualization.
 */
export function Canvas({ renderer, className = "" }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderer.setCanvas(canvas);

    const handleResize = () => {
      renderer.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderer]);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />;
}
