import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { autoCreateChannelForUser } from "@/actions/autoCreateChannel"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: '/auth/signin',
    },
    trustHost: true,
    debug: true,
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;

                // Auto-create channel for new user on first login
                if (account?.access_token && user.id) {
                    // Run in background, don't block login
                    autoCreateChannelForUser(user.id, account.access_token).catch(err => {
                        console.error('Failed to auto-create channel:', err);
                    });
                }
            }
            // Store access token for YouTube API
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                // @ts-ignore
                session.accessToken = token.accessToken as string;
            }
            return session;
        },
    },
})
