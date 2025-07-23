"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/user-button";
import { api } from "@/lib/api";

export function Header() {
  const [user, setUser] = useState<{ email: string; name?: string; avatar?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.user.getProfile();
        setUser(userData);
      } catch {
        // User not authenticated
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <header className="border-b border-gray-800 bg-black backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-white rounded-lg"></div>
          <span className="font-bold text-xl text-white">LaunchSaaS</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-10 w-20 bg-gray-800 rounded animate-pulse"></div>
          ) : user ? (
            <UserButton user={user} />
          ) : (
            <>
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
