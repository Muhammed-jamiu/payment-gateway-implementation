import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/app/generated/prisma-client";

const prisma = new PrismaClient();

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    // 1. Get the transaction reference from the URL
    const reference = request.nextUrl.searchParams.get("reference");

    if (!reference || !reference.trim()) {
      return NextResponse.json(
        { message: "Transaction reference is required" },
        { status: 400 },
      );
    }

    // 2. Check that the Paystack secret key exists
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { message: "Paystack configuration is missing" },
        { status: 500 },
      );
    }

    // 3. Find the payment in our database
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json(
        { message: "Payment record not found" },
        { status: 404 },
      );
    }

    // 4. Prevent an already verified payment from being processed again
    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        message: "Payment has already been verified",
        data: {
          reference: payment.reference,
          paymentStatus: payment.status,
          orderStatus: payment.order.status,
        },
      });
    }

    // 5. Ask Paystack to verify the transaction
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      },
    );

    const result = (await paystackResponse.json()) as PaystackVerifyResponse;

    // 6. Check whether Paystack processed the verification request
    if (!paystackResponse.ok || result.status !== true || !result.data) {
      return NextResponse.json(
        {
          message: "Unable to verify transaction with Paystack",
          details: result.message,
        },
        { status: 502 },
      );
    }

    const transaction = result.data;

    // 7. Confirm that the transaction belongs to this payment
    if (
      transaction.reference !== payment.reference ||
      transaction.amount !== payment.amount ||
      transaction.currency !== payment.currency
    ) {
      return NextResponse.json(
        {
          message: "Transaction details do not match our payment record",
        },
        { status: 409 },
      );
    }

    // 8. Check the actual transaction status
    if (transaction.status !== "success") {
      // Only mark a clearly failed or abandoned transaction as FAILED.
      // Pending or ongoing transactions remain PENDING.
      if (
        transaction.status === "failed" ||
        transaction.status === "abandoned"
      ) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
      }

      return NextResponse.json(
        {
          message: "Payment has not been completed successfully",
          transactionStatus: transaction.status,
        },
        { status: 409 },
      );
    }

    // 9. Mark the payment and order as successful atomically
    const [updatedPayment, updatedOrder] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS" },
      }),

      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
      }),
    ]);

    // 10. Return the verification result
    return NextResponse.json({
      message: "Payment verified successfully",
      data: {
        reference: updatedPayment.reference,
        paymentStatus: updatedPayment.status,
        orderStatus: updatedOrder.status,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      { message: "An error occurred while verifying payment" },
      { status: 500 },
    );
  }
}
