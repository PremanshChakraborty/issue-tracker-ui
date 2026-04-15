import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        token.githubId = Number(profile.id);
        token.githubLogin = (profile.login ?? "") as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.githubId = token.githubId as number;
        session.user.githubLogin = token.githubLogin as string;
      }
      return session;
    },
  },
});
