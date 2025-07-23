"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { toast } from "sonner";

interface UserButtonProps {
  user: {
    email: string;
    name?: string;
    avatar?: string;
  };
}

export function UserButton({ user }: UserButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      toast.success("Déconnecté avec succès");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const getInitials = (email: string, name?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-800">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name || user.email} />
            <AvatarFallback className="bg-white text-black border">
              {getInitials(user.email, user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border-gray-200" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-black">
              {user.name || "Utilisateur"}
            </p>
            <p className="text-xs leading-none text-gray-600">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem 
          onClick={() => router.push("/settings")}
          className="text-black hover:bg-gray-100 focus:bg-gray-100"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => router.push("/settings")}
          className="text-black hover:bg-gray-100 focus:bg-gray-100"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-black hover:bg-gray-100 focus:bg-gray-100"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
