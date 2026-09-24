"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Tablet,
  Monitor,
  HandCoins,
  ClipboardList,
  CloudUpload,
  Gift,
  ArrowRight,
  Check,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Sección de la homepage que responde a la pregunta "¿cómo llega posib a
 * cualquier tienda, incluso la más pequeña?":
 *  - No hay que comprar equipos: corre en el navegador (celular, tablet, PC).
 *  - Resuelve dolores reales del tendero: fiados, reporte diario, respaldo en nube.
 *  - Programa de referidos.
 *
 * Cada tarjeta tiene un modal de ayuda interactivo (Dialog de shadcn) que
 * conserva el color principal de marca (brand = #007c80).
 */

interface HelpModal {
  title: string;
  description: string;
  steps: string[];
}

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  text: string;
  help: HelpModal;
}

const FEATURES: FeatureCard[] = [
  {
    icon: HandCoins,
    title: "Lleva los fiados sin cuadernos",
    text: "Registra quién te debe, cuánto y desde cuándo. Abona pagos parciales y ten siempre claro tu dinero en la calle.",
    help: {
      title: "Cómo llevar los fiados",
      description:
        "El control de cuentas por cobrar reemplaza el cuaderno de fiados por algo que no se pierde ni se borra.",
      steps: [
        "En una venta, elige el método de pago \"Crédito\" y selecciona al cliente.",
        "La deuda queda guardada con fecha, monto y productos.",
        "Cuando el cliente abona, registras el pago parcial y la deuda baja sola.",
        "Ves en todo momento cuánto te deben en total y quién tiene la cuenta más vieja.",
      ],
    },
  },
  {
    icon: ClipboardList,
    title: "Reporte diario de lo vendido",
    text: "Cada día recibes un resumen de tus ventas y tus fiados. Sabes cuánto entró sin sacar cuentas a mano.",
    help: {
      title: "Cómo funciona el reporte diario",
      description:
        "Un resumen automático de tu día que llega sin que tengas que hacer nada.",
      steps: [
        "Vendes normal durante el día desde tu punto de venta.",
        "A la hora que elijas, posib arma el resumen: total vendido, número de ventas y fiados pendientes.",
        "Te llega directo por Telegram (y puedes sumar a un empleado como destinatario).",
        "Empiezas y cierras el día sabiendo exactamente cómo te fue.",
      ],
    },
  },
  {
    icon: CloudUpload,
    title: "Respaldo automático en la nube",
    text: "Una copia de tus ventas se guarda sola en tu Google Drive cada día. Aunque pierdas el teléfono, tu información está a salvo.",
    help: {
      title: "Cómo se respaldan tus ventas",
      description:
        "Tu información queda guardada en tu propio Google Drive, sin que tengas que acordarte de hacerlo.",
      steps: [
        "Conectas tu cuenta de Google una sola vez.",
        "Cada día, posib guarda una copia de tus ventas en tu Drive, en un archivo de Excel.",
        "La copia es tuya y queda en tu cuenta, no en un servidor ajeno.",
        "Si cambias de teléfono o se daña, tu historial no se pierde.",
      ],
    },
  },
];

export default function WhyPosib() {
  const [openHelp, setOpenHelp] = useState<HelpModal | null>(null);

  return (
    <section className="container mx-auto px-4 py-12 md:py-20">
      {/* Bloque 1: sin comprar equipos */}
      <div className="text-center mb-10 md:mb-14">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          No necesitas comprar equipos
        </h3>
        <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto">
          posib.dev funciona desde el navegador, así que corre en el celular,
          la tablet o el computador que ya tienes. Sin cajas registradoras
          costosas, sin instalar nada complicado.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-14 md:mb-20">
        {[
          { icon: Smartphone, label: "Celular" },
          { icon: Tablet, label: "Tablet" },
          { icon: Monitor, label: "Computador" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-5 md:px-10 md:py-7 ring-1 ring-white/15"
          >
            <div className="rounded-full bg-brand p-3 md:p-4 shadow-lg">
              <Icon className="h-7 w-7 md:h-9 md:w-9 text-white" />
            </div>
            <span className="text-white font-semibold text-sm md:text-base">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Bloque 2: dolores resueltos con ayuda interactiva */}
      <div className="text-center mb-8 md:mb-12">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Pensado para la tienda de barrio
        </h3>
        <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto">
          Resuelve lo que de verdad te quita tiempo y plata. Toca{" "}
          <span className="font-semibold text-white">¿Cómo funciona?</span> en
          cada uno para verlo por dentro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16 md:mb-24">
        {FEATURES.map(({ icon: Icon, title, text, help }) => (
          <div
            key={title}
            className="flex flex-col rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 border-t-4 border-brand"
          >
            <div className="mb-4 inline-flex w-fit rounded-full bg-brand-light p-3">
              <Icon className="h-7 w-7 text-brand" />
            </div>
            <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
              {title}
            </h4>
            <p className="text-sm md:text-base text-gray-600 grow">{text}</p>
            <button
              type="button"
              onClick={() => setOpenHelp(help)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover transition-colors cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              ¿Cómo funciona?
            </button>
          </div>
        ))}
      </div>

      {/* Bloque 3: referidos */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-brand to-brand-hover p-8 md:p-12 text-center shadow-2xl">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-white/15 p-4">
          <Gift className="h-9 w-9 md:h-10 md:w-10 text-white" />
        </div>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
          Invita a otro tendero y ganan los dos
        </h3>
        <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-6">
          ¿Conoces a otro negocio que anda con cuadernos y papeles? Recomiéndale
          posib.dev. Cuando empiece a usarlo, ustedes dos reciben un beneficio en
          su suscripción.
        </p>
        <ul className="mx-auto mb-8 max-w-md space-y-2 text-left">
          {[
            "Le compartes tu invitación por WhatsApp.",
            "El tendero crea su cuenta y prueba el sistema.",
            "Cuando activa su plan, ambos reciben su recompensa.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-white/95">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-white" />
              <span className="text-sm md:text-base">{item}</span>
            </li>
          ))}
        </ul>
        <Link href="/sign-up" className="inline-block">
          <Button
            size="lg"
            className="text-base md:text-lg bg-white text-brand hover:bg-gray-100 font-semibold"
          >
            Empezar y luego invitar{" "}
            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </Link>
      </div>

      {/* Modal de ayuda interactivo — conserva el color de marca */}
      <Dialog open={!!openHelp} onOpenChange={(o) => !o && setOpenHelp(null)}>
        <DialogContent className="sm:max-w-lg border-t-4 border-brand">
          <DialogHeader>
            <DialogTitle className="text-xl text-brand">
              {openHelp?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {openHelp?.description}
            </DialogDescription>
          </DialogHeader>
          <ol className="mt-2 space-y-3">
            {openHelp?.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm md:text-base text-gray-700 pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex justify-end">
            <Link href="/sign-up">
              <Button className="bg-brand hover:bg-brand-hover text-white">
                Quiero probarlo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
