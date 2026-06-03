import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db.server";
import { requireUser, UnauthorizedError } from "@/lib/user.server";
import { CONNECTORS, listRegisteredConnectors } from "@/lib/connectors/registry";

export async function GET() {
  try {
    const user = await requireUser();
    const connected = await prisma.connector.findMany({
      where: { userId: user.id },
    });
    const connectedByProvider = new Map(
      connected.map((c) => [c.provider, c] as const)
    );
    const out = listRegisteredConnectors().map((spec) => {
      const c = connectedByProvider.get(spec.provider);
      return {
        provider: spec.provider,
        label: spec.label,
        description: spec.description,
        icon: spec.icon,
        scopes: spec.scopes,
        connected: Boolean(c),
        expiresAt: c?.expiresAt?.toISOString() ?? null,
        metadata: c?.metadata ?? null,
      };
    });
    return NextResponse.json({ connectors: out });
  } catch (e: any) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[/api/connectors GET]", e?.message ?? e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to load connectors" },
      { status: 500 }
    );
  }
}
