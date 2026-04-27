"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/compare", label: "Invest" },
  { href: "/voice", label: "Save" },
  { href: "/chat", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-cream border-b border-ink/10 card-shadow">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl md:text-2xl font-black text-saffron tracking-tight font-heading">
            Nivesh Saathi
          </span>
        </Link>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-lg font-heading font-medium transition-colors hover:text-saffron",
              pathname === link.href
                ? "text-saffron border-b-2 border-saffron pb-1 font-bold"
                : "text-ink-light"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="p-2 rounded-full hover:bg-cream-dark transition-colors"
            id="lang-switcher"
          >
            <span className="material-symbols-outlined text-saffron">
              translate
            </span>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg card-shadow border border-outline/30 py-2 animate-fade-in">
              {["English", "हिंदी", "தமிழ்", "বাংলা"].map((lang) => (
                <button
                  key={lang}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-saffron-bg transition-colors"
                  onClick={() => setLangOpen(false)}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-full hover:bg-cream-dark transition-colors relative">
          <span className="material-symbols-outlined text-saffron">
            notifications
          </span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-saffron rounded-full"></span>
        </button>

        {/* Profile */}
        <div className="w-8 h-8 rounded-full bg-saffron text-white flex items-center justify-center text-sm font-bold">
          N
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-cream-dark transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span className="material-symbols-outlined text-ink">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 bg-cream z-40 md:hidden animate-fade-in">
          <nav className="flex flex-col p-6 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-lg font-heading transition-colors",
                  pathname === link.href
                    ? "bg-saffron-bg text-saffron font-bold"
                    : "text-ink-light hover:bg-cream-dark"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
