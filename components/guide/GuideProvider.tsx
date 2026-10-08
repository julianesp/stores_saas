"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { GUIDES, getGuide } from "@/lib/guide/guides";
import {
  MAX_NUDGES,
  getNudgeCount,
  getSeenGuides,
  markGuideSeen,
  setNudgeCount,
  subscribeGuideProgress,
} from "@/lib/guide/guide-progress";
import { isAutoHelpEnabled } from "@/lib/help-preferences";
import { GuideNudge } from "./GuideNudge";
import { GuidePanel, type GuideTab } from "./GuidePanel";
import { GuideSpotlight, findGuideTarget } from "./GuideSpotlight";
import { GuideCenter } from "./GuideCenter";
import s from "./guide.module.css";

/**
 * Guía de uso para tenderos nuevos. Pensada para NO estorbar:
 *  - Nada bloquea la pantalla: sin fondo oscuro ni pasos obligatorios.
 *  - La primera vez que se entra a una sección aparece un aviso pequeño en la
 *    esquina ("¿Primera vez en Vender?"). Si se ignora, deja de salir solo
 *    después de MAX_NUDGES visitas; si se responde "Ahora no", no vuelve.
 *  - La guía es un panel flotante con la demo animada ("Mira cómo") y los pasos
 *    ("Hazlo tú"). "Mostrarme" encoge el panel y señala el botón real.
 *  - Todas las guías quedan en el botón de ayuda del encabezado.
 */

interface GuideContextValue {
  seen: readonly string[];
  openGuide: (id: string) => void;
  openCenter: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide debe usarse dentro de <GuideProvider>");
  return ctx;
}

const NUDGE_DELAY_MS = 1400;

export function GuideProvider({
  children,
  nudgesEnabled = true,
}: {
  children: ReactNode;
  /** false para superadmin: no se le ofrecen guías de tendero solas. */
  nudgesEnabled?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const uid = user?.id;

  const seen = useSyncExternalStore(
    subscribeGuideProgress,
    () => getSeenGuides(uid),
    () => getSeenGuides(),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<GuideTab>("demo");
  const [step, setStep] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [spotTarget, setSpotTarget] = useState<string | null>(null);
  const [centerOpen, setCenterOpen] = useState(false);
  const [nudgeId, setNudgeId] = useState<string | null>(null);

  const activeGuide = activeId ? getGuide(activeId) : undefined;

  const openGuide = useCallback(
    (id: string) => {
      const guide = getGuide(id);
      if (!guide) return;
      if (pathname !== guide.href) router.push(guide.href);
      setActiveId(id);
      setTab(guide.sceneId ? "demo" : "steps");
      setStep(0);
      setMinimized(false);
      setSpotTarget(null);
      setCenterOpen(false);
      setNudgeId(null);
      markGuideSeen(id, uid);
    },
    [pathname, router, uid],
  );

  const closeGuide = useCallback(() => {
    setActiveId(null);
    setMinimized(false);
    setSpotTarget(null);
  }, []);

  const openCenter = useCallback(() => {
    closeGuide();
    setNudgeId(null);
    setCenterOpen(true);
  }, [closeGuide]);

  const showTarget = useCallback((target: string, missing?: string) => {
    if (!findGuideTarget(target)) {
      toast.info("Esa parte todavía no aparece en esta pantalla.", {
        description: missing ?? "Aparece cuando tengas datos para mostrar en ella.",
      });
      return;
    }
    setMinimized(true);
    setSpotTarget(target);
  }, []);

  const restore = useCallback(() => {
    setSpotTarget(null);
    setMinimized(false);
  }, []);

  // Al cambiar de pantalla: deja de señalar (el elemento ya no existe) y quita
  // el aviso de la pantalla anterior.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setSpotTarget(null);
    setNudgeId(null);
  }

  // Aviso de primera visita a una sección.
  useEffect(() => {
    if (!nudgesEnabled || !isLoaded || activeId || centerOpen) return;
    const guide = GUIDES.find((g) => g.href === pathname);
    if (!guide) return;

    const t = window.setTimeout(() => {
      if (!isAutoHelpEnabled()) return;
      if (getSeenGuides(uid).includes(guide.id)) return;
      const count = getNudgeCount(guide.id, uid);
      if (count >= MAX_NUDGES) return;
      // No competir con un modal abierto (suscripción, bienvenida, etc.).
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"]')) return;
      setNudgeCount(guide.id, count + 1, uid);
      setNudgeId(guide.id);
    }, NUDGE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, nudgesEnabled, isLoaded, uid, activeId, centerOpen]);

  const dismissNudge = useCallback(() => {
    if (nudgeId) setNudgeCount(nudgeId, MAX_NUDGES, uid);
    setNudgeId(null);
  }, [nudgeId, uid]);

  // Escape: primero deja de señalar; luego cierra el panel si el foco está en él.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (spotTarget) {
        restore();
        return;
      }
      const panel = document.getElementById("guide-panel");
      if (activeId && panel?.contains(document.activeElement)) closeGuide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spotTarget, activeId, restore, closeGuide]);

  const value = useMemo(
    () => ({ seen, openGuide, openCenter }),
    [seen, openGuide, openCenter],
  );

  const nudgeGuide = nudgeId ? getGuide(nudgeId) : undefined;

  return (
    <GuideContext.Provider value={value}>
      {children}
      <div className={s.root}>
        <GuideNudge
          guide={nudgeGuide}
          onOpen={() => nudgeId && openGuide(nudgeId)}
          onDismiss={dismissNudge}
        />
        <GuidePanel
          guide={activeGuide}
          onRoute={!!activeGuide && pathname === activeGuide.href}
          tab={tab}
          onTabChange={setTab}
          step={step}
          onStepChange={setStep}
          minimized={minimized}
          onRestore={restore}
          onShowTarget={showTarget}
          onGoToRoute={() => activeGuide && router.push(activeGuide.href)}
          onClose={closeGuide}
          onOpenCenter={openCenter}
        />
        <GuideSpotlight target={spotTarget} onDone={() => setSpotTarget(null)} />
        <GuideCenter
          open={centerOpen}
          onOpenChange={setCenterOpen}
          seen={seen}
          pathname={pathname}
          onOpenGuide={openGuide}
        />
      </div>
    </GuideContext.Provider>
  );
}
