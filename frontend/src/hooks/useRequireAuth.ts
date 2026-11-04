import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { auth, useAuth } from "@/lib/authStore";

export function useRequireAuth() {
  const user = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) {
      void auth.loginDemo();
    }
  }, [user]);
  return user;
}
