import React, { useState } from "react";
import Header from "@/app/components/header/header";
import Footer from "@/app/components/footer/footer";
import "@/app/globals.css";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMenuOpen(prev => !prev);
  };

  return (  
    <>
    <Header menuOpen={menuOpen} onMenuToggle={handleMenuToggle} />
        {children}
      <Footer />
    </>
  );
}