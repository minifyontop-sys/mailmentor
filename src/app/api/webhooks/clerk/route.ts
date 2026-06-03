import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/db.server";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const { type, data } = evt;

    switch (type) {
      case "user.created":
      case "user.updated": {
        const id = data.id as string;
        const email = data.email_addresses?.[0]?.email_address as string | undefined;
        const firstName = (data as any).first_name ?? "";
        const lastName = (data as any).last_name ?? "";
        const name = [firstName, lastName].filter(Boolean).join(" ") || null;
        const image = (data as any).image_url ?? null;

        if (!email) break;

        await prisma.user.upsert({
          where: { email: email.toLowerCase() },
          create: {
            email: email.toLowerCase(),
            clerkId: id,
            name,
            image,
          },
          update: {
            clerkId: id,
            name: name ?? undefined,
            image: image ?? undefined,
          },
        });
        break;
      }
      case "user.deleted": {
        const id = data.id as string;
        if (!id) break;
        await prisma.user.deleteMany({ where: { clerkId: id } });
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[/api/webhooks/clerk]", e?.message ?? e);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }
}
