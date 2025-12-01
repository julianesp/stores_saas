import Swal from 'sweetalert2';

/**
 * Configuración personalizada de SweetAlert2 para el sistema POS
 */

// Configuración por defecto
const defaultConfig = {
  confirmButtonColor: '#2563eb', // Blue-600
  cancelButtonColor: '#64748b', // Slate-500
  confirmButtonText: 'Aceptar',
  cancelButtonText: 'Cancelar',
};

/**
 * Notificación de éxito
 */
export const showSuccess = (message: string, title: string = '¡Éxito!') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'top-end',
    toast: true,
    background: '#f0fdf4',
    iconColor: '#22c55e',
  });
};

/**
 * Notificación de error
 */
export const showError = (message: string, title: string = 'Error') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    timer: 4000,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'top-end',
    toast: true,
    background: '#fef2f2',
    iconColor: '#ef4444',
  });
};

/**
 * Notificación de advertencia
 */
export const showWarning = (message: string, title: string = 'Advertencia') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    timer: 3500,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'top-end',
    toast: true,
    background: '#fffbeb',
    iconColor: '#f59e0b',
  });
};

/**
 * Notificación de información
 */
export const showInfo = (message: string, title: string = 'Información') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'top-end',
    toast: true,
    background: '#eff6ff',
    iconColor: '#3b82f6',
  });
};

/**
 * Confirmación con botones
 */
export const showConfirm = async (
  message: string,
  title: string = '¿Estás seguro?',
  options?: {
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'question' | 'info';
  }
) => {
  const result = await Swal.fire({
    title,
    text: message,
    icon: options?.type || 'warning',
    showCancelButton: true,
    confirmButtonText: options?.confirmText || 'Sí, continuar',
    cancelButtonText: options?.cancelText || 'Cancelar',
    confirmButtonColor: defaultConfig.confirmButtonColor,
    cancelButtonColor: defaultConfig.cancelButtonColor,
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
};

/**
 * Confirmación de eliminación (más específica)
 */
export const showDeleteConfirm = async (
  itemName: string,
  message?: string
) => {
  const result = await Swal.fire({
    title: '¿Eliminar este elemento?',
    html: `
      <p class="mb-2">Estás a punto de eliminar:</p>
      <p class="font-bold text-lg">${itemName}</p>
      ${message ? `<p class="text-sm text-gray-600 mt-2">${message}</p>` : ''}
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626', // Red-600
    cancelButtonColor: defaultConfig.cancelButtonColor,
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
};

/**
 * Modal de carga/procesando
 */
export const showLoading = (message: string = 'Procesando...') => {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Cerrar modal de carga
 */
export const closeLoading = () => {
  Swal.close();
};

/**
 * Modal con formulario de input
 */
export const showInput = async (
  title: string,
  placeholder: string,
  inputType: 'text' | 'email' | 'number' | 'password' = 'text',
  defaultValue: string = ''
) => {
  const result = await Swal.fire({
    title,
    input: inputType,
    inputPlaceholder: placeholder,
    inputValue: defaultValue,
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: defaultConfig.confirmButtonColor,
    cancelButtonColor: defaultConfig.cancelButtonColor,
    inputValidator: (value) => {
      if (!value) {
        return 'Este campo es requerido';
      }
      return null;
    },
  });

  if (result.isConfirmed) {
    return result.value;
  }
  return null;
};

/**
 * Modal con HTML personalizado
 */
export const showCustom = (config: any) => {
  return Swal.fire({
    ...defaultConfig,
    ...config,
  });
};

/**
 * Notificación de producto agregado (específica para POS)
 */
export const showProductAdded = (productName: string, quantity: number = 1) => {
  return Swal.fire({
    icon: 'success',
    title: 'Producto agregado',
    html: `
      <p class="text-sm"><strong>${productName}</strong></p>
      <p class="text-xs text-gray-600 mt-1">Cantidad: ${quantity}</p>
    `,
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'top-end',
    toast: true,
    background: '#f0fdf4',
    iconColor: '#22c55e',
  });
};

/**
 * Notificación de venta completada
 */
export const showSaleCompleted = (saleNumber: string, total: number) => {
  return Swal.fire({
    icon: 'success',
    title: '¡Venta Completada!',
    html: `
      <div class="text-center py-4">
        <p class="text-sm text-gray-600">Número de venta</p>
        <p class="text-2xl font-bold text-blue-600 my-2">${saleNumber}</p>
        <p class="text-sm text-gray-600">Total</p>
        <p class="text-xl font-bold text-green-600">${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(total)}</p>
      </div>
    `,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: defaultConfig.confirmButtonColor,
    timer: 5000,
    timerProgressBar: true,
  });
};

/**
 * Toast simple (equivalente a toast de sonner pero con SweetAlert2)
 */
export const toast = {
  success: (message: string) => showSuccess(message),
  error: (message: string) => showError(message),
  warning: (message: string) => showWarning(message),
  info: (message: string) => showInfo(message),
};

// Export por defecto
export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  confirm: showConfirm,
  deleteConfirm: showDeleteConfirm,
  loading: showLoading,
  closeLoading,
  input: showInput,
  custom: showCustom,
  productAdded: showProductAdded,
  saleCompleted: showSaleCompleted,
  toast,
};
