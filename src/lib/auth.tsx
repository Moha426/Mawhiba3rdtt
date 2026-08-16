import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  isLoaded: boolean;
  getToken: () => Promise<string | null>;
  login: (username: string) => Promise<void>;
  logout: (opts?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const syncUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Failed to parse stored user", e);
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Initial sync
    syncUserFromStorage();

    // 1. Listen for standard storage events (across windows/tabs/iframes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "auth_user" || e.key === null) {
        syncUserFromStorage();
        qc.invalidateQueries({ queryKey: ["student-profile"] });
      }
    };

    // 2. Listen for custom window events (same frame)
    const handleCustomEvent = () => {
      syncUserFromStorage();
      qc.invalidateQueries({ queryKey: ["student-profile"] });
    };

    // 3. Listen for iframe postMessage events
    const handlePostMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "AUTH_CHANGED") {
        syncUserFromStorage();
        qc.invalidateQueries({ queryKey: ["student-profile"] });
      }
    };

    // 4. BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("school_auth_channel");
      bc.onmessage = (e) => {
        if (e.data && e.data.type === "AUTH_CHANGED") {
          syncUserFromStorage();
          qc.invalidateQueries({ queryKey: ["student-profile"] });
        }
      };
    } catch {}

    window.addEventListener("storage", handleStorage);
    window.addEventListener("local_auth_change", handleCustomEvent);
    window.addEventListener("message", handlePostMessage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local_auth_change", handleCustomEvent);
      window.removeEventListener("message", handlePostMessage);
      if (bc) bc.close();
    };
  }, [qc]);

  const notifyAllFrames = (newUser: User | null) => {
    // Dispatch local custom event
    window.dispatchEvent(new CustomEvent("local_auth_change", { detail: newUser }));

    // Post message to parent if inside iframe
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "AUTH_CHANGED", user: newUser }, "*");
      }
    } catch {}

    // Post message to child iframes
    try {
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((frame) => {
        try {
          frame.contentWindow?.postMessage({ type: "AUTH_CHANGED", user: newUser }, "*");
        } catch {}
      });
    } catch {}

    // Broadcast channel
    try {
      const channel = new BroadcastChannel("school_auth_channel");
      channel.postMessage({ type: "AUTH_CHANGED", user: newUser });
      channel.close();
    } catch {}
  };

  const login = async (username: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Calculate stable numeric ID hash for user
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = (hash << 5) - hash + username.charCodeAt(i);
      hash |= 0;
    }
    const cleanId = String(Math.abs(hash) || Math.floor(Math.random() * 8999) + 1000);

    const newUser = {
      id: cleanId,
      name: username.trim(),
      username: username.trim(),
    };

    setUser(newUser);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    notifyAllFrames(newUser);

    qc.invalidateQueries({ queryKey: ["student-profile"] });
    setIsLoading(false);
  };

  const logout = async (opts?: any) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 200));

    setUser(null);
    localStorage.removeItem("auth_user");
    notifyAllFrames(null);

    qc.clear();
    setIsLoading(false);
    if (opts?.redirectUrl) {
      setLocation(opts.redirectUrl);
    }
  };

  const getToken = async () => null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isSignedIn: !!user, 
      isLoaded: !isLoading, 
      getToken, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
