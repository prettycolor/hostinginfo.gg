import { createContext, useContext } from "react";

export interface User {
  id: number;
  email: string;
  fullName: string | null;
  profileName?: string | null;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
  level?: number;
  isAdmin?: boolean;
  isDisabled?: boolean;
  selectedAvatarId?: number | null;
  avatarImagePath?: string | null;
  avatarRarity?: string | null;
}

export interface SignupResult {
  message?: string;
  token?: string;
  emailSent?: boolean;
  requiresEmailVerification?: boolean;
  user?: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName?: string,
    username?: string,
  ) => Promise<SignupResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
