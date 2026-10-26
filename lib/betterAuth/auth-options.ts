import { BetterAuthOptions } from "better-auth";
import { hash, compare } from "bcryptjs";

export const authOptions = {
  appName: "Felix Controls Limited",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    password: {
      hash: async (password: string) => {
        if (Buffer.byteLength(password, "utf8") > 72) {
          throw new Error("Password must be at most 72 bytes");
        }
        return hash(password, 12);
      },
      verify: async ({
        hash: storedHash,
        password,
      }: {
        hash: string;
        password: string;
      }) => compare(password, storedHash),
    },
  },
  user: {
    changeEmail: { enabled: false },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,

    cookieCache: {
      enabled: false,
    },
  },

  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 5,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 100,
      },
    },
  },
} satisfies BetterAuthOptions;
