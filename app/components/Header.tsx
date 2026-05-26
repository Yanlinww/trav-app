'use client';
import { useState } from "react";
import { usePathname } from "next/navigation"; // 1. 引入官方 Hook
import { Link } from "./Link";
import { Plane, Map, Calendar, User, Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 2. 用 usePathname() 取代 window.location.pathname
  const currentPath = usePathname(); 

  const navItems = [
    { path: "/", label: "首頁", icon: Plane },
    { path: "/destinations", label: "旅遊景點", icon: Map },
    { path: "/planner", label: "行程規劃", icon: Calendar },
    { path: "/profile", label: "個人中心", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Plane className="size-5 text-black" />
          <span className="font-light text-black text-lg tracking-wider">VOYAGE</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm tracking-wide transition-colors ${
                currentPath === item.path
                  ? "text-black border-b-2 border-black pb-1"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login">
            <button className="px-5 py-2 text-sm tracking-wide text-gray-700 hover:text-black transition-colors">
              登入
            </button>
          </Link>
          <button className="px-5 py-2 text-sm tracking-wide bg-black text-white hover:bg-gray-800 transition-colors">
            註冊
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="size-5 text-black" />
          ) : (
            <Menu className="size-5 text-black" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm tracking-wide transition-colors ${
                  currentPath === item.path ? "text-black" : "text-gray-500"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="flex gap-3 mt-4">
              <Link to="/login" className="flex-1">
                <button className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 hover:border-black transition-colors">
                  登入
                </button>
              </Link>
              <button className="flex-1 px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 transition-colors">
                註冊
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}