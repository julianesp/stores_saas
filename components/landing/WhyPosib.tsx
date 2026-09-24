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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpModal {
  title: string;
  description: string;
  steps: string[];
}

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  text: string;
  accent: string;
  help: HelpModal;
}

const FEATURES: FeatureCard[] = [
  {
    icon: HandCoins,
    title: "Lleva los fiados sin cuadernos",
    text: "Registra quién te debe, cuánto y desde cuándo. Abona pagos parciales y ten siempre claro tu dinero en la calle.",
    accent: "text-amber-400",
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
    accent: "text-sky-400",
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
    accent: "text-brand",
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
    <section className="border-t border-white/5">
      <div className="container mx-auto px-4 py-16 md:py-24">

        {/* Bloque 1: sin comprar equipos */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
            Sin costos extras
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            No necesitas comprar equipos
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            posib.dev corre en el navegador — celular, tablet o computador que ya tienes. Sin cajas registradoras costosas.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16 md:mb-24">
          {[
            { icon: Smartphone, label: "Celular" },
            { icon: Tablet, label: "Tablet" },
            { icon: Monitor, label: "Computador" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/3 ring-1 ring-white/8 px-8 py-6 min-w-[120px]"
            >
              <div className="rounded-xl bg-brand/15 p-3">
                <Icon className="h-7 w-7 text-brand" />
              </div>
              <span className="text-white/80 font-medium text-sm">{label}</span>
            </div>
          ))}
        </div>

        {/* Bloque 2: pensado para la tienda */}
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
            Pensado para la tienda de barrio
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            Resuelve lo que sí importa
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            Toca <span className="text-white/80">¿Cómo funciona?</span> en cada uno para verlo por dentro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-16 md:mb-24">
          {FEATURES.map(({ icon: Icon, title, text, accent, help }) => (
            <div
              key={title}
              className="group flex flex-col rounded-2xl bg-white/3 ring-1 ring-white/8 p-6 hover:ring-white/16 transition-all duration-200"
            >
              <div className="mb-4 inline-flex w-fit rounded-xl bg-white/6 p-2.5">
                <Icon className={`h-6 w-6 ${accent}`} />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">{title}</h4>
              <p className="text-sm text-white/50 leading-relaxed grow">{text}</p>
              <button
                type="button"
                onClick={() => setOpenHelp(help)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
                ¿Cómo funciona?
              </button>
            </div>
          ))}
        </div>

        {/* Bloque 3: referidos */}
        <div className="max-w-4xl mx-auto rounded-3xl ring-1 ring-brand/20 bg-brand/8 p-8 md:p-12 text-center">
          <div className="mx-auto mb-5 inline-flex rounded-2xl bg-brand/15 p-4">
            <Gift className="h-8 w-8 text-brand" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Invita a otro tendero y ganan los dos
          </h3>
          <p className="text-base text-white/50 max-w-2xl mx-auto mb-7">
            ¿Conoces a otro negocio que anda con cuadernos? Recomiéndale posib.dev.
            Cuando empiece a usarlo, ustedes dos reciben un beneficio en su suscripción.
          </p>
          <ul className="mx-auto mb-8 max-w-sm space-y-2.5 text-left">
            {[
              "Le compartes tu invitación por WhatsApp.",
              "El tendero crea su cuenta y prueba el sistema.",
              "Cuando activa su plan, ambos reciben su recompensa.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                  <Check className="h-3 w-3 text-brand" />
                </span>
                <span className="text-sm text-white/70">{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-hover text-white font-semibold shadow-lg shadow-brand/20"
            >
              Empezar y luego invitar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Modal de ayuda */}
      {openHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setOpenHelp(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-[#161b22] ring-1 ring-white/10 p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenHelp(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-1 text-brand font-bold text-lg">{openHelp.title}</div>
            <p className="text-sm text-white/50 mb-5">{openHelp.description}</p>
            <ol className="space-y-3">
              {openHelp.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/70 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex justify-end">
              <Link href="/sign-up">
                <Button className="bg-brand hover:bg-brand-hover text-white text-sm">
                  Quiero probarlo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
