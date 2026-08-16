import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-8 w-8 animate-spin text-primary ${className}`} />;
}

export function LoadingPage() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <LoadingSpinner />
      <p className="font-medium animate-pulse">جاري تحميل البيانات...</p>
    </div>
  );
}
