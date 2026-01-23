"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    // Reemplaza con tu número de WhatsApp (incluye código de país sin + ni espacios)
    const phoneNumber = "573174503604"; // Ejemplo: Colombia
    const message = encodeURIComponent(
      "Hola, me gustaría saber más sobre el sistema POS",
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 left-6 z-50 rounded-full w-14 h-14 shadow-2xl bg-green-500 hover:bg-green-600 transition-all hover:scale-110 animate-bounce"
      size="icon"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  );
}
