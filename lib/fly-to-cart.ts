/**
 * Animación "fly to cart" para la tienda pública.
 *
 * Clona el recuadro de imagen de un producto y lo hace volar desde su posición
 * actual (la tarjeta del catálogo) hasta el ícono del carrito en el navbar. Es
 * una animación de spatial consistency: muestra a dónde fue el producto.
 *
 * - Clona el contenedor de imagen completo (funciona con foto real o con el
 *   ícono placeholder cuando el producto no tiene imagen).
 * - Usa WAAPI (element.animate) sobre un clon con position:fixed, así el clon
 *   puede salir del contenedor de la tarjeta sin romper el layout.
 * - Solo anima transform/opacity (compositor-friendly).
 * - Respeta prefers-reduced-motion: si está activo, no hace nada.
 *
 * El navbar debe marcar su ícono de carrito con id="store-cart-icon".
 */

const CART_ICON_ID = 'store-cart-icon';

export function flyToCart(sourceEl: HTMLElement | null) {
  if (typeof window === 'undefined' || !sourceEl) return;

  // Sin movimiento si el usuario lo pidió: el pop del badge ya da feedback.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cartIcon = document.getElementById(CART_ICON_ID);
  if (!cartIcon) return;

  const startRect = sourceEl.getBoundingClientRect();
  const endRect = cartIcon.getBoundingClientRect();
  if (startRect.width === 0 || endRect.width === 0) return;

  // Centros de origen y destino, en coordenadas de viewport (para position:fixed)
  const startCenterX = startRect.left + startRect.width / 2;
  const startCenterY = startRect.top + startRect.height / 2;
  const endCenterX = endRect.left + endRect.width / 2;
  const endCenterY = endRect.top + endRect.height / 2;

  // Desplazamiento del centro del clon hacia el centro del carrito.
  const deltaX = endCenterX - startCenterX;
  const deltaY = endCenterY - startCenterY;

  // Clon visual del recuadro de imagen, fijado sobre su posición original.
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.margin = '0';
  clone.style.borderRadius = '12px';
  clone.style.overflow = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '9999';
  clone.style.willChange = 'transform, opacity';
  clone.style.transformOrigin = 'center center';

  document.body.appendChild(clone);

  const animation = clone.animate(
    [
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: 1,
      },
      // Arco: sube un poco a mitad de camino antes de caer al carrito.
      {
        transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.5 - 40}px) scale(0.6)`,
        opacity: 0.9,
        offset: 0.6,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.15)`,
        opacity: 0.3,
      },
    ],
    {
      duration: 650,
      // ease-in-out fuerte: sale con energía y desacelera al llegar al carrito.
      easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => clone.remove();
  animation.oncancel = () => clone.remove();
}
