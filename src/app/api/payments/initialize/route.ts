import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/src/app/generated/prisma-client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  let paymentId: string | undefined;

  try {
    // 1. Read the order ID from the request
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      typeof (body as Record<string, unknown>).orderId !== "string"
    ) {
      return NextResponse.json(
        { message: "A valid order ID is required" },
        { status: 400 },
      );
    }

    const orderId = (body as Record<string, string>).orderId.trim();

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID cannot be empty" },
        { status: 400 },
      );
    }

    // 2. Check the Paystack secret key
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { message: "Paystack configuration is missing" },
        { status: 500 },
      );
    }

    // 3. Retrieve the order from PostgreSQL
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // 4. Ensure the order is still awaiting payment
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { message: "This order is not available for payment" },
        { status: 409 },
      );
    }

    // 5. Generate a unique transaction reference
    const reference = `PAY-${randomUUID()}`;

    // 6. Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        reference,
        amount: order.totalAmount,
        orderId: order.id,
      },
    });

    paymentId = payment.id;

    // 7. Initialize the transaction with Paystack
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: order.customerEmail,
          amount: String(order.totalAmount),
          currency: "NGN",
          reference,
          callback_url: `${process.env.APP_URL}/payment/callback`,
          metadata: {
            orderId: order.id,
            paymentId: payment.id,
          },
        }),
      },
    );

    const result = await paystackResponse.json();

    // 8. Check Paystack's response
    if (!paystackResponse.ok || result.status !== true) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        {
          message: "Paystack transaction initialization failed",
          details: result.message,
        },
        { status: 502 },
      );
    }

    // 9. Return the checkout information
    return NextResponse.json(
      {
        message: "Payment initialized successfully",
        data: {
          reference: result.data.reference,
          authorizationUrl: result.data.authorization_url,
          accessCode: result.data.access_code,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Payment initialization error:", error);

    // Mark the local payment as failed if it was already created
    if (paymentId) {
      try {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "FAILED" },
        });
      } catch (updateError) {
        console.error("Payment status update error:", updateError);
      }
    }

    return NextResponse.json(
      { message: "Unable to initialize payment" },
      { status: 500 },
    );
  }
}
