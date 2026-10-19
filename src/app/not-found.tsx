import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <>
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="text-center">
          <p className="text-6xl font-bold text-brand-link">404</p>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Page not found
          </h1>
          <p className="mt-2 text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-action-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-700"
          >
            Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
