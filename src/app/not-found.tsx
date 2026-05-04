import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[90vh] items-center justify-center bg-app px-3 py-8 tablet:px-4">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-outline bg-panel p-5 text-center shadow-soft tablet:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-accent mb-6">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-[clamp(1.9rem,7vw,2.25rem)] font-semibold leading-tight text-text-strong">
          Page not found
        </h1>
        <p className="text-sm leading-6 text-text-muted mb-8 max-w-sm mx-auto">
          We couldn&apos;t find the page you were looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <Link href="/">
          <Button variant="secondary" size="lg" className="w-full rounded-full shadow-sm tablet:w-auto">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
