/**
 * Worker and officer sessions.
 *
 * A demo-grade stand-in for the real thing. In production this boundary is
 * where eShram's UAN authentication and Aadhaar-based OTP would sit; we mock
 * that exchange and issue our own signed session, so the rest of the system
 * is written against the shape of the real integration.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "shramsetu-dev-secret-not-for-production",
);

const WORKER_COOKIE = "ss_worker";
const OFFICER_COOKIE = "ss_officer";

async function sign(payload: Record<string, string>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

async function read(cookieName: string, field: string): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload[field] as string) ?? null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------- worker

export async function startWorkerSession(workerId: string) {
  const jar = await cookies();
  jar.set(WORKER_COOKIE, await sign({ workerId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endWorkerSession() {
  (await cookies()).delete(WORKER_COOKIE);
}

export async function currentWorkerId() {
  return read(WORKER_COOKIE, "workerId");
}

export async function currentWorker() {
  const id = await currentWorkerId();
  if (!id) return null;
  return db.worker.findUnique({ where: { id } });
}

// ------------------------------------------------------------------ officer

export async function startOfficerSession(officerId: string) {
  const jar = await cookies();
  jar.set(OFFICER_COOKIE, await sign({ officerId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endOfficerSession() {
  (await cookies()).delete(OFFICER_COOKIE);
}

export async function currentOfficer() {
  const id = await read(OFFICER_COOKIE, "officerId");
  if (!id) return null;
  return db.officer.findUnique({ where: { id } });
}
