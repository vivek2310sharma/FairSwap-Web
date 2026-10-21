import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";

export default function SearchLoading() {
  return (
    <>
      <Header />
      <main className="flex min-h-[50vh] flex-1 items-center justify-center bg-surface/30">
        <div className="flex flex-col items-center gap-4 text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-action-600" aria-hidden="true" />
          <p className="text-sm font-medium">Finding listings...</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
