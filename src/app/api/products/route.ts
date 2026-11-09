import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/app/generated/prisma-client";
import { count } from "console";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Read the request body
    const body = await request.json();

    // 2. Extract the product information
    const { name, description, priceInKobo } = body;

    // 3. Validate the information
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof priceInKobo !== "number" ||
      !Number.isSafeInteger(priceInKobo) ||
      priceInKobo <= 0 ||
      (description !== undefined &&
        description !== null &&
        typeof description !== "string")
    ) {
      return NextResponse.json(
        { message: "Invalid product information" },
        { status: 400 },
      );
    }

    // 4. Create the product in the database
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() || null : null,
        price: priceInKobo,
      },
    });

    // 5. Return the created product
    return NextResponse.json(
      {
        message: "Product created successfully",
        data: product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product creation error:", error);

    return NextResponse.json(
      { message: "Unable to create product" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany();
    return NextResponse.json(
      {
        count: products.length,
        message: "Products retrieved successfully",
        data: products,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Product retrieval error:", error);
    return NextResponse.json(
      { message: "Unable to retrieve products" },
      { status: 500 },
    );
  }
}
