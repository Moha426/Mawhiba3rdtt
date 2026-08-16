interface ScrollSpringProps {
  children: React.ReactNode;
  className?: string;
  scrollKey?: string;
}

export function ScrollSpring({ children, className, scrollKey: _scrollKey }: ScrollSpringProps) {
  return (
    <div
      className={`overflow-y-auto overscroll-none ${className ?? ""}`}
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
