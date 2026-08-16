import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
      <Link href="/">
        <Button size="lg" className="font-bold">
          العودة للرئيسية
        </Button>
      </Link>
    </div>
  );
}
