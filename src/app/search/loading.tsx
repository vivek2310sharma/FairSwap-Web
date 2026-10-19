import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";

export default function SearchLoading() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-surface/30 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          <p className="text-sm font-medium">Finding listings...</p>
        </div>
      </main>
      <Footer />
    </>
  );
}