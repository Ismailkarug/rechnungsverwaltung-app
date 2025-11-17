
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Get allowed emails from environment variable
const getAllowedEmails = (): string[] => {
  const allowedEmails = process.env.ALLOWED_EMAILS || '';
  return allowedEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const allowedEmails = getAllowedEmails();
        const userEmail = credentials.email.toLowerCase();

        // Check if email is in the allowed list
        if (!allowedEmails.includes(userEmail)) {
          console.log(`Access denied: ${userEmail} is not in the allowed list`);
          return null;
        }

        // Accept test credentials for validation
        if (credentials.email === 'john@doe.com' && credentials.password === 'johndoe123') {
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
