import React, { useState } from "react";
import { useTheme } from "@/lib/theme";

interface AppLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "auto" | "light" | "dark";
  onClick?: () => void;
}

export function AppLogo({
  className = "h-10 w-auto",
  variant = "auto",
  onClick,
  ...props
}: AppLogoProps) {
  const { theme } = useTheme();
  const isDark = variant === "dark" ? true : variant === "light" ? false : theme === "dark";

  const [imgFailed, setImgFailed] = useState(false);

  const imgClasses = "h-full w-auto object-contain max-w-full select-none transition-transform duration-200";
  const containerClasses = `relative inline-flex items-center justify-center shrink-0 select-none ${className} ${onClick ? "cursor-pointer" : ""}`;

  // Image source based on active theme
  const darkLogo = "https://res.cloudinary.com/dgplafutp/image/upload/v1786885692/%D9%82%D8%AF%D8%B1%D8%A7%D8%AA_%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%B5%D8%B1_20260816_160733_0000_ud5sdj.svg";
  const lightLogo = "https://res.cloudinary.com/dgplafutp/image/upload/v1786885691/%D9%82%D8%AF%D8%B1%D8%A7%D8%AA_%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%B5%D8%B1_20260816_160743_0000_rnzqyj.svg";

  const primarySrc = isDark ? darkLogo : lightLogo;
  const secondarySrc = isDark ? lightLogo : darkLogo;

  return (
    <div className={containerClasses} onClick={onClick} {...props}>
      {!imgFailed ? (
        <img
          src={primarySrc}
          alt="ثالث موهبة"
          className={imgClasses}
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Try secondary source before switching to SVG fallback
            const target = e.currentTarget;
            if (target.src.endsWith(primarySrc)) {
              target.src = secondarySrc;
            } else {
              setImgFailed(true);
            }
          }}
        />
      ) : (
        /* Bulletproof Inline SVG Fallback: inherits currentColor from text-foreground/primary */
        <div className={`flex items-center gap-2 font-black text-lg ${isDark ? "text-white" : "text-slate-900"} ${className}`}>
          <div className="h-8 w-8 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black text-base shadow-sm">
            ٣
          </div>
          <span className="tracking-tight text-sm md:text-base font-black">ثالث موهبة</span>
        </div>
      )}
    </div>
  );
}

export default AppLogo;


