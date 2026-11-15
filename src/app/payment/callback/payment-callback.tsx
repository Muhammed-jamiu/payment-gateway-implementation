"use client";

import { useEffect, useState } from "react";

type VerificationResult = {
  message?: string;
  data?: {
    reference: string;
    paymentStatus: string;
    orderStatus: string;
    amount: number;
    currency: string;
  };
};

type Props = {
  reference: string | null;
};

export default function PaymentCallback({ reference }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setError("Transaction reference is missing.");
      setLoading(false);
      return;
    }

    async function verifyPayment() {
      const transactionReference = reference;

      if (!transactionReference) return;

      try {
        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(transactionReference)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data: VerificationResult = await response.json();

        if (!response.ok) {
          setError(data.message || "Payment verification failed.");
          return;
        }

        setResult(data);
      } catch (error) {
        console.error("Verification request error:", error);
        setError("Unable to verify payment. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [reference]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Verifying your payment...</h1>
          <p className="mt-2 text-gray-500">
            Please wait while we confirm your transaction.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Payment not confirmed
          </h1>
          <p className="mt-3 text-gray-600">{error}</p>
          {reference && (
            <p className="mt-3 break-all text-sm text-gray-500">
              Reference: {reference}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (
    result?.data?.paymentStatus === "SUCCESS" &&
    result.data.orderStatus === "PAID"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-green-600">
            Payment Successful!
          </h1>

          <p className="mt-3 text-gray-600">
            Your payment has been verified successfully.
          </p>

          <div className="mt-6 rounded-lg border p-4 text-left">
            <p>
              <strong>Reference:</strong> {result.data.reference}
            </p>

            <p className="mt-2">
              <strong>Amount:</strong> {result.data.currency}{" "}
              {(result.data.amount / 100).toLocaleString()}
            </p>

            <p className="mt-2">
              <strong>Payment status:</strong> {result.data.paymentStatus}
            </p>

            <p className="mt-2">
              <strong>Order status:</strong> {result.data.orderStatus}
            </p>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Payment not completed</h1>
        <p className="mt-3 text-gray-600">
          {result?.message || "We could not confirm your payment."}
        </p>
      </div>
    </main>
  );
}
