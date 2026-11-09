import { NextResponse } from "next/server";
import { PrismaClient } from "@/src/app/generated/prisma-client";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Get the product ID from the URL
    const { id } = await context.params;

    // 2. Check whether the product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    // 3. Delete the product
    await prisma.product.delete({
      where: { id },
    });

    // 4. Return a success response
    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete product error:", error);

    return NextResponse.json(
      { message: "Unable to delete product" },
      { status: 500 },
    );
  }
}

// get product by id
export async function GET(request: Request, context: RouteContext) {
  try {
    // 1. Get the product ID from the URL
    const { id } = await context.params;

    // 2. Find the product in the database
    const product = await prisma.product.findUnique({
      where: { id },
    });

    // 3. Check whether the product exists
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    // 4. Return the product
    return NextResponse.json(
      {
        message: "Product retrieved successfully",
        data: product,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get product error:", error);

    return NextResponse.json(
      { message: "Unable to retrieve product" },
      { status: 500 },
    );
  }
}
