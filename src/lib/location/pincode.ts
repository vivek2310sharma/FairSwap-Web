import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { PincodeLookupResult } from "@/types/listing";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates whether a given string is a valid 6-digit Indian PIN code.
 */
export function isValidIndianPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Server-side lookup of Indian PIN code data via FairSwap Supabase RPC.
 */
export async function lookupPincodeServer(
  pincode: string,
  client?: SupabaseClient
): Promise<PincodeLookupResult> {
  const cleanPin = pincode.trim();

  if (!isValidIndianPincode(cleanPin)) {
    return {
      success: false,
      error: "INVALID_PINCODE",
      message: "PIN code must be exactly 6 numeric digits",
    };
  }

  try {
    const supabase = (client || (await createClient())) as SupabaseClient<Database>;
    
    // Call lookup_pincode RPC
    const { data, error } = await supabase.rpc("lookup_pincode", {
      p_pincode: cleanPin,
    });

    if (error) {
      console.error(`RPC lookup_pincode error for PIN ${cleanPin}:`, error.message);
      return {
        success: false,
        error: "FETCH_ERROR",
        message: "Failed to resolve location for this PIN code",
      };
    }

    const res = data as unknown as PincodeLookupResult;

    if (!res || !res.success) {
      return (
        res || {
          success: false,
          error: "PINCODE_NOT_FOUND",
          message: "PIN code not found in postal database",
        }
      );
    }

    return res;
  } catch (err: unknown) {
    console.error(`Unexpected error looking up PIN ${cleanPin}:`, err);
    return {
      success: false,
      error: "FETCH_ERROR",
      message: "An unexpected error occurred during PIN lookup",
    };
  }
}
