import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db.server";
import { getConnectorSpec } from "@/lib/connectors/registry";

/**
 * POST /api/connectors/[provider]/disconnect
 *
 * Removes the Connector row. Any future recipe run that tries to use
 * the connector will get a clear "not connected" error.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const spec = getConnectorSpec(params.provider);
  if (!spec) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  await prisma.connector
    .delete({
      where: { userId_provider: { userId: user.id, provider: spec.provider } },
    })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
