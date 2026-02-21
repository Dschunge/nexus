import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24 hours
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL!,
    // Cover the ports Next.js auto-selects when 3000 is taken
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3001", "http://localhost:3002", "http://localhost:3003",
         "http://localhost:3004", "http://localhost:3005"]
      : []),
  ],
});

export type Session = typeof auth.$Infer.Session;
