"use client";

import { createAuthClient } from "better-auth/react";

// Use this app's /api/auth endpoints and Better Auth's built-in tab synchronization.
export const authClient = createAuthClient();
