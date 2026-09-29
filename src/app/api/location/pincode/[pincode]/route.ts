import { NextRequest, NextResponse } from "next/server";
import { lookupPincodeServer } from "@/lib/location/pincode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PINCODE",
        message: "PIN code must be exactly 6 numeric digits",
      },
      { status: 400 }
    );
  }

  const result = await lookupPincodeServer(pincode);

  if (!result.success) {
    const status = result.error === "INVALID_PINCODE" ? 400 : result.error === "PINCODE_NOT_FOUND" ? 404 : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
