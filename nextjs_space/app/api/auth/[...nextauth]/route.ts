
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Accept test credentials for validation
        if (credentials?.email === 'john@doe.com' && credentials?.password === 'johndoe123') {
          return {
            id: '1',
            email: 'john@doe.com',
            name: 'John Doe',
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/dashboard',
  },
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };
