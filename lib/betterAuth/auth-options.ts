import { BetterAuthOptions } from "better-auth";
import { hash, compare } from "bcryptjs";

const authOptions = {
  appName: "Felix Controls Limited",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    password: {
      hash: async (password: string) => {
        if (Buffer.byteLength(password, "utf8")) {
          throw new Error("Password must be at most 72 bytes");
        }
        return hash(password, 12);
      },
    },
  },
} satisfies BetterAuthOptions;
