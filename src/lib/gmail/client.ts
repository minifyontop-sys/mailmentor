import { google } from "googleapis";
import { getServerSession, authOptions } from "@/lib/auth";

export async function getGmailClient() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    throw new Error("Not authenticated with Gmail");
  }
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: session.accessToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}
