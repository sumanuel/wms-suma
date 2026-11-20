import { NextResponse } from "next/server";
import { poolControl } from "@/lib/nucleo/control";

// Lo consulta el balanceador. Comprueba solo la base de control; cada cliente se comprueba al operar.
export async function GET() {
  try {
    await poolControl().query("SELECT 1");
    return NextResponse.json({ estado: "ok" });
  } catch {
    return NextResponse.json({ estado: "error" }, { status: 503 });
  }
}
