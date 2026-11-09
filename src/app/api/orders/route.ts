import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/app/generated/prisma-client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Read the request body
    const body: unknown = await request.json();

    // 2. Validate the request body
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const { customerEmail, productId } = body as Record<string, unknown>;

    if (
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) ||
      typeof productId !== "string" ||
      !productId.trim()
    ) {
      return NextResponse.json(
        { message: "A valid customer email and product ID are required" },
        { status: 400 },
      );
    }

    // 3. Find the product in the database
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    // 4. Check whether the product exists
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    // 5. Create the order
    const order = await prisma.order.create({
      data: {
        customerEmail: customerEmail.trim(),
        totalAmount: product.price,
        productId: product.id,
      },
      include: {
        product: true,
      },
    });

    // 6. Return the created order
    return NextResponse.json(
      {
        message: "Order created successfully",
        data: order,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      { message: "Unable to create order" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // 1. Retrieve all orders
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        payments: true,
      },
    });

    // 2. Return the orders
    return NextResponse.json(
      {
        message: "Orders retrieved successfully",
        data: orders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get orders error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve orders" },
      { status: 500 }
    );
  }
}