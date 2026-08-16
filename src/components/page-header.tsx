import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  color?: string;
  children?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, color, children }: PageHeaderProps) {
  const accent = color || "var(--primary)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between gap-4 mb-6"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${accent}22 0%, ${accent}10 100%)`,
            border: `1px solid ${accent}20`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </motion.div>
  );
}
