import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import { compareSync } from "bcrypt-edge";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function normalizeRole(role: unknown) {
  return typeof role === "string" && role.trim()
    ? role.trim().toUpperCase()
    : undefined;
}

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth(() => {
  const { env } = getCloudflareContext();
  const db = env.DB;

  return {
    adapter: D1Adapter(db),
    session: { strategy: "jwt" },
    trustHost: true,
    secret: env.AUTH_SECRET || env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/auth/signin",
    },
    providers: [
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email =
            typeof credentials?.email === "string"
              ? credentials.email.trim().toLowerCase()
              : "";
          const password =
            typeof credentials?.password === "string" ? credentials.password : "";

          console.log("[Auth] Authorize called with email:", email);
          if (!email || !password) return null;

          try {
            console.log("[Auth] Querying D1 database...");
            const user = await db.prepare(
              `SELECT id, email, name, image, role, hashedPassword, isActive FROM users WHERE email = ? LIMIT 1`
            )
              .bind(email)
              .first<any>();

            if (!user) {
              console.log("[Auth] User not found");
              return null;
            }

            console.log("[Auth] User found:", user.email, "isActive:", user.isActive);

            if (!user.hashedPassword || !user.isActive) {
              console.log("[Auth] No password or user inactive");
              return null;
            }

            console.log("[Auth] Comparing password...");
            const isValid = compareSync(password, user.hashedPassword);
            console.log("[Auth] Password valid:", isValid);

            if (!isValid) return null;

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
            };
          } catch (error: any) {
            console.error("[Auth] D1 error:", error.message);
            return null;
          }
        },
      }),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? [
            Google({
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            }),
          ]
        : []),
      ...(env.AZURE_AD_CLIENT_ID && env.AZURE_AD_CLIENT_SECRET
        ? [
            AzureAD({
              clientId: env.AZURE_AD_CLIENT_ID,
              clientSecret: env.AZURE_AD_CLIENT_SECRET,
              issuer: env.AZURE_AD_TENANT_ID
                ? `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/v2.0`
                : undefined,
            }),
          ]
        : []),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = normalizeRole((user as any).role);
          token.id = user.id;
        }

        try {
          const tokenId =
            typeof token.id === "string"
              ? token.id
              : typeof token.sub === "string"
                ? token.sub
                : "";
          const tokenEmail =
            typeof token.email === "string" ? token.email.trim().toLowerCase() : "";

          const dbUser = tokenId
            ? await db.prepare(
                `SELECT id, email, name, image, role, isActive FROM users WHERE id = ? LIMIT 1`
              )
                .bind(tokenId)
                .first<any>()
            : tokenEmail
              ? await db.prepare(
                  `SELECT id, email, name, image, role, isActive FROM users WHERE email = ? LIMIT 1`
                )
                  .bind(tokenEmail)
                  .first<any>()
              : null;

          if (dbUser && dbUser.isActive !== false && dbUser.isActive !== 0) {
            if (dbUser?.id) token.id = dbUser.id;
            if (dbUser?.role) token.role = normalizeRole(dbUser.role);
            if (dbUser?.email) token.email = dbUser.email;
            if (dbUser?.name) token.name = dbUser.name;
            if (dbUser?.image) token.picture = dbUser.image;
          }
        } catch (error: any) {
          console.warn("[Auth] Failed to refresh token role:", error?.message || error);
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).role = normalizeRole(token.role) || "CLIENT";
          (session.user as any).id =
            typeof token.id === "string"
              ? token.id
              : typeof token.sub === "string"
                ? token.sub
                : "";
        }
        return session;
      },
    },
  };
});
