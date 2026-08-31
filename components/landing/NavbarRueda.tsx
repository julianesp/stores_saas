"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./NavbarRueda.module.scss";

type NavLink = { href: string; label: string };

const navigationLinks: NavLink[] = [
  { href: "#precios", label: "Precios" },
  { href: "#resenas", label: "Reseñas" },
  { href: "#faq", label: "Preguntas frecuentes" },
  { href: "/sign-in", label: "Entrar" },
  { href: "/sign-up", label: "Crear cuenta" },
];

// Reordena los enlaces en "montaña": los de texto más largo quedan al centro
// (donde el panel es más ancho por la curva) y los más cortos en los extremos.
function ordenarPorLongitud(links: NavLink[]): NavLink[] {
  const porLongitud = [...links].sort((a, b) => b.label.length - a.label.length);
  const n = porLongitud.length;
  const resultado = new Array<NavLink>(n);
  const centro = Math.floor((n - 1) / 2);
  porLongitud.forEach((link, i) => {
    const paso = Math.ceil(i / 2);
    const pos = i % 2 === 1 ? centro + paso : centro - paso;
    resultado[pos] = link;
  });
  return resultado;
}

const navLinksCurva = ordenarPorLongitud(navigationLinks);

export default function NavbarRueda() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Hover de la marca: al activarse, se muestra ampliada en el centro del viewport.
  const [marcaHover, setMarcaHover] = useState(false);
  // El contenido con portal a document.body solo se renderiza tras montar.
  const [montado, setMontado] = useState(false);
  // Índice del enlace que está en el centro de la rueda (el activo).
  const [ruedaActiva, setRuedaActiva] = useState(0);
  // Acumulador del scroll para no saltar de enlace con cada tic mínimo.
  const acumScroll = useRef(0);

  // Marca el montaje en cliente para poder usar portales a document.body.
  // Se difiere con rAF para no llamar a setState síncronamente en el efecto.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Abre/cierra el menú. Al abrir, reinicia la rueda al primer enlace (se hace
  // aquí, en el handler, y no dentro de un efecto).
  const toggleMenu = () => {
    setIsMenuOpen((abierto) => {
      const siguiente = !abierto;
      if (siguiente) {
        setRuedaActiva(0);
        acumScroll.current = 0;
      }
      return siguiente;
    });
  };

  // Mientras el menú está abierto, bloquea el scroll de la página (scroll-lock
  // fijando el body) para que el scroll solo gire la rueda.
  useEffect(() => {
    if (isMenuOpen) {
      acumScroll.current = 0;
      const scrollY = window.scrollY;
      const { style } = document.body;
      const prev = {
        position: style.position,
        top: style.top,
        width: style.width,
        overflow: style.overflow,
      };
      style.position = "fixed";
      style.top = `-${scrollY}px`;
      style.width = "100%";
      style.overflow = "hidden";
      return () => {
        style.position = prev.position;
        style.top = prev.top;
        style.width = prev.width;
        style.overflow = prev.overflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMenuOpen]);

  const UMBRAL = 40; // sensibilidad: px de desplazamiento por cada enlace

  // Avanza/retrocede el enlace activo según el desplazamiento acumulado.
  const avanzar = (delta: number) => {
    acumScroll.current += delta;
    if (acumScroll.current > UMBRAL) {
      acumScroll.current = 0;
      setRuedaActiva((n) => Math.min(n + 1, navLinksCurva.length - 1));
    } else if (acumScroll.current < -UMBRAL) {
      acumScroll.current = 0;
      setRuedaActiva((n) => Math.max(n - 1, 0));
    }
  };

  // Scroll del ratón (desktop). onWheel de React es pasivo, pero el body ya
  // está bloqueado con scroll-lock, así que no hace falta preventDefault.
  const handleWheel = (e: React.WheelEvent) => {
    avanzar(e.deltaY);
  };

  // Arrastre táctil (móvil): registramos la Y del dedo y giramos la rueda con
  // el desplazamiento. Dedo hacia arriba => avanza (igual que el scroll).
  const touchPrevY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchPrevY.current = e.touches[0].clientY;
    acumScroll.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchPrevY.current === null) return;
    const y = e.touches[0].clientY;
    avanzar(touchPrevY.current - y);
    touchPrevY.current = y;
  };
  const handleTouchEnd = () => {
    touchPrevY.current = null;
    acumScroll.current = 0;
  };

  // Cerrar el menú al hacer clic en el fondo (backdrop).
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).id === "mobile-menu-backdrop") {
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className={`top-0 z-50 ${styles.navbar}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center h-16">
          {/* Marca centrada. Mientras el cursor está sobre ella, se muestra una
              copia ampliada en el centro del viewport (vía portal). */}
          <Link
            href="/"
            className={styles.logoLink}
            onMouseEnter={() => setMarcaHover(true)}
            onMouseLeave={() => setMarcaHover(false)}
          >
            <span
              className="text-xl md:text-2xl font-bold text-white text-outline-dark"
              translate="no"
              style={{ visibility: marcaHover ? "hidden" : "visible" }}
            >
              posib.dev
            </span>
          </Link>

          {/* Botón hamburguesa a la derecha. z-index propio y touch-action para
              que reciba el toque de forma fiable en móvil (el backdrop-filter
              del nav puede interferir con el hit-testing táctil de los hijos). */}
          <div className="absolute right-0 z-[70] flex items-center">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu-backdrop"
              style={{ touchAction: "manipulation" }}
              className="relative p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 border-2 border-gray-300"
            >
              <svg
                className="h-6 w-6 text-gray-800 duration-500 transition-transform"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable: panel lateral derecho con forma de hoja. Se renderiza
          con portal a document.body. Aplica en todas las resoluciones. */}
      {montado &&
        createPortal(
          <div
            id="mobile-menu-backdrop"
            className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
              isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={handleBackdropClick}
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            {/* Panel derecho con forma de hoja */}
            <div
              className={`${styles.panelCurvo} ${
                isMenuOpen
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 translate-x-full pointer-events-none"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar (X) arriba a la derecha */}
              <div className="flex justify-end px-6 pt-6 pb-2 flex-shrink-0">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white/50 text-white hover:bg-white hover:text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Rueda de enlaces (tipo "llanta"): los enlaces se distribuyen
                  sobre un arco. El activo queda en el centro; los demás se
                  curvan hacia arriba/abajo, atenuados hasta que rotan al centro
                  con el scroll del mouse o el arrastre del dedo. */}
              <div
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative flex flex-col items-end justify-center pr-4 sm:pr-6 flex-1 overflow-hidden select-none"
                style={{ touchAction: "none" }}
              >
                {/* Llanta: círculo (SVG) del que solo se ve la mitad izquierda.
                    Rota junto con los enlaces al cambiar el activo. */}
                {(() => {
                  const DIAM = 360;
                  const giro = ruedaActiva * 22;
                  return (
                    <svg
                      className="absolute pointer-events-none"
                      width={DIAM}
                      height={DIAM}
                      style={{
                        top: "50%",
                        right: -DIAM / 2,
                        transform: `translateY(-50%) rotate(${giro}deg)`,
                        transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
                      }}
                      aria-hidden="true"
                    >
                      <circle
                        cx={DIAM / 2}
                        cy={DIAM / 2}
                        r={DIAM / 2 - 4}
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="4"
                        strokeDasharray="16 26"
                        strokeLinecap="round"
                      />
                    </svg>
                  );
                })()}
                {navLinksCurva.map((link, i) => {
                  const offset = i - ruedaActiva; // 0 = centro; ± = arriba/abajo
                  const abs = Math.abs(offset);
                  // Ventana de la rueda: dentro se ven, en el borde (BORDE) hacen
                  // fade a 0 y más allá se desmontan. Así, al subir/bajar, los
                  // enlaces aparecen y se desvanecen suavemente en vez de saltar.
                  const VISIBLES = 2;
                  const BORDE = VISIBLES + 1;
                  if (abs > BORDE) return null;
                  const angulo = (offset / (VISIBLES + 1)) * (Math.PI / 2);
                  const RADIO = 150;
                  const SEPARACION_Y = 46;
                  const y = offset * SEPARACION_Y;
                  const x = RADIO * Math.cos(angulo);
                  const esActivo = offset === 0;
                  // Fade agresivo por distancia: el activo a plena opacidad y los
                  // vecinos se atenúan rápido (0.55 por paso), de modo que el
                  // desvanecido hacia arriba/abajo se note aunque haya pocos
                  // enlaces. En el anillo BORDE quedan casi invisibles.
                  const opacidad = esActivo
                    ? 1
                    : Math.max(0, 1 - abs * 0.55);
                  const escala = esActivo ? 1 : Math.max(0.6, 1 - abs * 0.16);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      style={{
                        position: "absolute",
                        right: `${x + 16}px`,
                        top: "50%",
                        transform: `translateY(calc(-50% + ${y}px)) scale(${escala})`,
                        opacity: isMenuOpen ? opacidad : 0,
                        zIndex: 10 - abs,
                        transition:
                          "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease, right 0.4s cubic-bezier(0.22,1,0.36,1), background-color 0.2s ease, color 0.2s ease",
                        pointerEvents: isMenuOpen && abs < BORDE ? "auto" : "none",
                        touchAction: "none",
                      }}
                      className={`${esActivo ? styles.pillLinkActivo : styles.pillLink} inline-flex items-center justify-between gap-4 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wide whitespace-nowrap`}
                    >
                      <span>{link.label}</span>
                      <svg className="w-4 h-4 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Marca ampliada en el centro del viewport (portal a body).
          Se muestra mientras el cursor está sobre la marca del navbar. */}
      {montado &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${marcaHover ? 1 : 0.6})`,
              opacity: marcaHover ? 1 : 0,
              transition: "opacity 0.35s ease, transform 0.35s ease",
              pointerEvents: "none",
              zIndex: 100,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              className="backdrop-blur-sm"
              style={{
                gridArea: "1 / 1",
                width: 420,
                height: 420,
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.35)",
                zIndex: 1,
              }}
            />
            <span
              className="text-5xl md:text-6xl font-bold text-white drop-shadow-2xl"
              translate="no"
              style={{ gridArea: "1 / 1", position: "relative", zIndex: 2 }}
            >
              posib.dev
            </span>
          </div>,
          document.body
        )}
    </nav>
  );
}
