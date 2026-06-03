export type AccountProvider = "google" | "azure-ad";

export interface LinkedAccount {
  id: string;
  provider: AccountProvider;
  email: string;
  name?: string;
  image?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
