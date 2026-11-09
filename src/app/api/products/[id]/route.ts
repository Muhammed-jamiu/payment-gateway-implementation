import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
