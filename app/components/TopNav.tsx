'use client';

import { useEffect, useState } from "react";
import { Link } from "./Link";
import { Plane, Map, Calendar, User } from "lucide-react";

export function TopNav() {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const navItems = [
    { path: "/", label: "首頁", icon: Plane },
    { path: "/destinations", label: "旅遊景點", icon: Map },
    { path: "/planner", label: "行程規劃", icon: Calendar },
    { path: "/profile", label: "個人中心", icon: User },
  ];

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            currentPath === item.path
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
          }`}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}