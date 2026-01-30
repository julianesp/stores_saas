import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { LoyaltySettings, LoyaltyTier } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

// Niveles por defecto
const DEFAULT_TIERS: LoyaltyTier[] = [
  { min_amount: 0, max_amount: 19999, points: 0, name: "Sin puntos" },
  { min_amount: 20000, max_amount: 49999, points: 5, name: "Compra pequeña" },
  { min_amount: 50000, max_amount: 99999, points: 10, name: "Compra mediana" },
  { min_amount: 100000, max_amount: 199999, points: 25, name: "Compra grande" },
  { min_amount: 200000, max_amount: 499999, points: 50, name: "Compra muy grande" },
  { min_amount: 500000, max_amount: Infinity, points: 100, name: "Compra premium" },
];

/**
 * GET - Obtener configuración de loyalty settings
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${API_URL}/loyalty-settings?clerk_user_id=${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const settings = await response.json();
      return NextResponse.json(settings);
    } else if (response.status === 404) {
      // No existe configuración, devolver valores por defecto
      const defaultSettings: LoyaltySettings = {
        id: "default",
        user_profile_id: userId,
        enabled: true,
        tiers: DEFAULT_TIERS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json(defaultSettings);
    } else {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || "Error al obtener configuración" },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/loyalty-settings:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Guardar/actualizar configuración de loyalty settings
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enabled, tiers } = body;

    // Validación básica
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'enabled' requerido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json(
        { error: "Debe haber al menos un nivel de puntos" },
        { status: 400 }
      );
    }

    // Validar que los tiers no se superpongan
    const sortedTiers = [...tiers].sort((a, b) => a.min_amount - b.min_amount);
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      if (sortedTiers[i].max_amount >= sortedTiers[i + 1].min_amount) {
        return NextResponse.json(
          { error: "Los rangos de montos no pueden superponerse" },
          { status: 400 }
        );
      }
    }

    const response = await fetch(
      `${API_URL}/loyalty-settings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerk_user_id: userId,
          enabled,
          tiers,
        }),
      }
    );

    if (response.ok) {
      const settings = await response.json();
      return NextResponse.json({
        message: "Configuración guardada exitosamente",
        settings,
      });
    } else {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || "Error al guardar configuración" },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/loyalty-settings:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
