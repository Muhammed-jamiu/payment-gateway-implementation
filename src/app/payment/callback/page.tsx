import { Suspense } from "react";
import PaymentCallback from "./payment-callback";

type PageProps = {
  searchParams: Promise<{
    reference?: string | string[];
  }>;
};

// This component reads the dynamic URL information.
async function PaymentCallbackContent({ searchParams }: PageProps) {
  const params = await searchParams;

  const reference =
    typeof params.reference === "string" ? params.reference : null;

  return <PaymentCallback reference={reference} />;
}

// This is the page component.
export default function PaymentCallbackPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p className="text-lg font-medium">Loading payment information...</p>
        </main>
      }
    >
      <PaymentCallbackContent searchParams={searchParams} />
    </Suspense>
  );
}
