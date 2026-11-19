import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/db/connectDB";
import User from "@/models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "RoleMed Credentials",
      credentials: {
        email: { label: "Hospital Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Designated Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide both email address and password");
        }

        await connectDB();

        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        });

        if (!user) {
          throw new Error("Invalid credentials or account does not exist");
        }

        if (!user.isActive) {
          throw new Error("Account is inactive or pending administrator approval");
        }

        // Verify password
        const isMatch = await user.comparePassword(credentials.password);
        if (!isMatch) {
          throw new Error("Invalid credentials. Please verify your password");
        }

        // If a specific role was selected on the login portal, verify role alignment
        if (credentials.role && credentials.role !== user.role) {
          throw new Error(
            `Account credential belongs to the '${user.role}' portal. Please select '${user.role}' in the role dropdown.`
          );
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department || "General",
          employeeId: user.employeeId || "",
          avatar: user.avatar || "",
          patientId: user.patientId || "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        token.employeeId = user.employeeId;
        token.avatar = user.avatar;
        token.patientId = user.patientId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.employeeId = token.employeeId;
        session.user.avatar = token.avatar;
        session.user.patientId = token.patientId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
