import PaymentCallback from "./payment-callback";

type PageProps = {
  searchParams: Promise<{
    reference?: string | string[];
  }>;
};

export default async function PaymentCallbackPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const reference =
    typeof params.reference === "string" ? params.reference : null;

  return <PaymentCallback reference={reference} />;
}
