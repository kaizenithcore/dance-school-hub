import { NextResponse } from "next/server";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

export function corsHeaders(origin?: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Tenant-Id, X-User-Id, X-Tenant-Role",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (process.env.NODE_ENV === "development") {
    // In development, allow all origins
    headers["Access-Control-Allow-Origin"] = origin || "*";
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function corsResponse(
  data: unknown,
  status: number,
  origin?: string | null
) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(origin),
  });
}

export function handleCorsPreFlight(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
