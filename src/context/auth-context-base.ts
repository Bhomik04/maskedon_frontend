import { createContext } from "react";
import type { User } from "../types";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    displayName: string,
    dateOfBirth: string,
    acceptedTerms: boolean,
    acceptedPrivacy: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
