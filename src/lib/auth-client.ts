"use client";

import { createAuthClient } from "better-auth/react";

/** ブラウザ側から認証APIを呼ぶためのクライアント */
export const authClient = createAuthClient();

export const { signUp, signIn, signOut, useSession } = authClient;
