import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      return session;
    },
    async jwt({ token, account, profile }) {
      return token;
    },
  },
  pages: {
    signIn: '/api-docs', // Redirect to API docs after auth
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
