interface ScrollSpringProps {
  children: React.ReactNode;
  className?: string;
  scrollKey?: string;
}

export function ScrollSpring({ children, className, scrollKey: _scrollKey }: ScrollSpringProps) {
  const isHidden = className?.includes("overflow-hidden");
  return (
    <div
      className={`${isHidden ? "overflow-hidden" : "overflow-y-auto"} overscroll-none ${className ?? ""}`}
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
