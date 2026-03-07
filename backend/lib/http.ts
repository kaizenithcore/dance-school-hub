import { NextResponse } from "next/server";
import type { ApiError } from "@/types/domain";
import { corsHeaders } from "@/lib/cors";

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

export function ok<T>(data: T, status = 200, origin?: string | null) {
  return NextResponse.json<SuccessResponse<T>>(
    { success: true, data },
    { status, headers: corsHeaders(origin) }
  );
}

export function fail(error: ApiError, status = 400, origin?: string | null) {
  return NextResponse.json<ErrorResponse>(
    { success: false, error },
    { status, headers: corsHeaders(origin) }
  );
}
