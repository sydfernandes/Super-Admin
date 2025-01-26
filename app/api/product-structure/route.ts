import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const dataFile = path.join(process.cwd(), "app/database/product-structure.json");

export async function GET() {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Failed to read product structure:", error);
    return NextResponse.json({ fields: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await fs.writeFile(dataFile, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save product structure:", error);
    return NextResponse.json(
      { error: "Failed to save product structure" },
      { status: 500 }
    );
  }
} 