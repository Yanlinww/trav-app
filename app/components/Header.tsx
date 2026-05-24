'use client';

import { useState } from "react";
import { Link } from "./Link";
import { Plane, Menu, X } from "lucide-react";
import { TopNav } from "./TopNav";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Plane className="size-6 text-blue-600" />
          <span className="font-bold text-xl">旅遊探索</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <TopNav />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              登入
            </button>
          </Link>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            註冊
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <TopNav />
            <div className="flex gap-2 mt-2">
              <Link to="/login" className="flex-1">
                <button className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  登入
                </button>
              </Link>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                註冊
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}