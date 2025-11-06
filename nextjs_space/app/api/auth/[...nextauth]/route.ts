
import NextAuth from 'next-auth';

const handler = NextAuth({
  providers: [],
  pages: {
    signIn: '/dashboard',
  },
});

export { handler as GET, handler as POST };
