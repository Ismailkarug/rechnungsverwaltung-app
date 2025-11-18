
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Authentifizierungsprüfung für API-Routen
 * Gibt die Session zurück oder einen 401-Fehler
 */
export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return {
      error: NextResponse.json(
        { error: "Nicht autorisiert. Bitte melden Sie sich an." },
        { status: 401 }
      ),
      session: null
    };
  }
  
  return { session, error: null };
}
