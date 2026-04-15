import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      /** Numeric GitHub user ID — used as the storage key in Vercel KV */
      githubId: number;
      /** GitHub login (username) — e.g. "PremanshChakraborty" */
      githubLogin: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    githubId: number;
    githubLogin: string;
  }
}
