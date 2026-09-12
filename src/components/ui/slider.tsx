import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      id,
      ...props
    },
    ref
  ) => {
    const currentValue = value !== undefined ? value[0] ?? min : defaultValue[0] ?? min;
    const percentage = Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = Number(e.target.value);
      if (onValueChange) {
        onValueChange([num]);
      }
    };

    return (
      <div
        className={cn(
          "relative flex w-full touch-none select-none items-center group",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary/80 dark:bg-muted border border-border/40">
          <div
            className="absolute h-full bg-primary transition-all duration-75 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          {...props}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-md transition-transform group-hover:scale-110 pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };

