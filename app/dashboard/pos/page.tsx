"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  User,
  X,
  Package,
  Scan,
  Camera,
} from "lucide-react";
// import { HelpCircle } from 'lucide-react'; // COMENTADO: Tour deshabilitado
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProducts,
  updateProduct,
  getCustomers,
  getCustomerById,
  createCustomer,
  getCategories,
  createSale,
  getUserProfile,
  getActiveOffers,
  Offer,
} from "@/lib/cloudflare-api";
import {
  Product,
  Customer,
  Category,
  Sale,
  SaleItemWithProduct,
  UserProfile,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  calculatePointsForPurchase,
  addPointsToCustomer,
  canRedeemDiscount,
  redeemPointsForDiscount,
  getPointsMilestoneMessage,
  REWARD_CONSTANTS,
} from "@/lib/loyalty-helpers";
import {
  canCustomerGetCredit,
  updateCustomerDebt,
} from "@/lib/cloudflare-credit-helpers";
import Swal from "@/lib/sweetalert";
import { BarcodeScannerZXing } from "@/components/products/barcode-scanner-zxing";
import { InvoiceModal } from "@/components/sales/invoice-modal";
import { UnitSelectorModal } from "@/components/pos/unit-selector-modal";
import Link from "next/link";
import { normalizeBarcode, barcodeEquals } from "@/lib/barcode-utils";
// COMENTADO: Tour deshabilitado
// import { useTour } from '@/hooks/useTour';
// import { posTourConfig } from '@/lib/tour-configs';

interface CartItem {
  product: Product;
  quantity: number;
  originalPrice?: number;
  discountPercentage?: number;
  hasOffer?: boolean;
  isUnitSale?: boolean; // Indica si se vende por unidades sueltas
  effectivePrice?: number; // Precio efectivo (por unidad o paquete)
}

export default function POSPage() {
  const { getToken } = useAuth();

  const { user } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [hasAnyProducts, setHasAnyProducts] = useState(true); // Track if user has ANY products
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "efectivo" | "tarjeta" | "transferencia" | "credito"
  >("efectivo");
  const [processing, setProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [canRedeem, setCanRedeem] = useState(false);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [scanSuccess, setScanSuccess] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false); // Mostrar input para lector USB
  const [lastCameraScannedCode, setLastCameraScannedCode] =
    useState<string>("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Estados para la factura
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [lastSaleItems, setLastSaleItems] = useState<SaleItemWithProduct[]>([]);
  const [lastSaleCustomer, setLastSaleCustomer] = useState<Customer | null>(
    null,
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Estados para el modal de selección de unidades
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [selectedProductForUnits, setSelectedProductForUnits] =
    useState<Product | null>(null);

  // COMENTADO: Tour deshabilitado
  // const { startTour } = useTour(posTourConfig, true, userId || undefined);

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      Swal.warning("Nombre requerido", "Debes ingresar el nombre del cliente");
      return;
    }

    try {
      const customerData: Partial<Customer> = {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || undefined,
        email: newCustomerData.email.trim() || undefined,
        loyalty_points: 0,
      };

      const newCustomer = await createCustomer(customerData, getToken);

      Swal.success(
        "Cliente creado",
        `${newCustomer.name} ha sido agregado exitosamente`,
      );

      // Seleccionar automáticamente el nuevo cliente
      setSelectedCustomer(newCustomer);

      // Limpiar el formulario y cerrarlo
      setNewCustomerData({ name: "", phone: "", email: "" });
      setShowNewCustomerForm(false);
      setShowCustomerSearch(false);

      // Actualizar lista de clientes
      await fetchCustomers();
    } catch (error) {
      console.error("Error creating customer:", error);
      Swal.error("Error al crear cliente", "Intenta nuevamente");
    }
  };

  const fetchOffers = useCallback(async () => {
    try {
      const offers = await getActiveOffers(getToken);
      setActiveOffers(offers || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
      // Si no hay ofertas o hay un error, simplemente usar un array vacío
      // Esto permite que el POS funcione normalmente sin ofertas
      setActiveOffers([]);
    }
  }, [getToken]);

  const getProductOffer = useCallback(
    (productId: string): Offer | undefined => {
      return activeOffers.find(
        (offer) => offer.product_id === productId && offer.is_active === 1,
      );
    },
    [activeOffers],
  );

  const getProductWithOffer = useCallback(
    (product: Product): Product => {
      const offer = getProductOffer(product.id);
      if (offer && offer.discount_percentage > 0) {
        const discountAmount =
          (product.sale_price * offer.discount_percentage) / 100;
        return {
          ...product,
          sale_price: product.sale_price - discountAmount,
        };
      }
      return product;
    },
    [getProductOffer],
  );

  const fetchProducts = useCallback(async () => {
    try {
      const data = (await getProducts(getToken)) as Product[];

      // Verificar si hay productos en el sistema (antes de filtrar por stock)
      setHasAnyProducts(data.length > 0);

      // Filtrar productos con stock > 0
      const productsInStock = data.filter((p) => p.stock > 0);
      // Ordenar por nombre manualmente
      productsInStock.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsInStock);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, [getToken]);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = (await getCustomers(getToken)) as Customer[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [getToken]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = (await getCategories(getToken)) as Category[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [getToken]);

  // Cargar perfil de usuario
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile(getToken);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [getToken]);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
    fetchCustomers();
    fetchCategories();
    fetchUserProfile();
    // Auto-focus en el input de código de barras
    barcodeRef.current?.focus();
  }, [
    fetchOffers,
    fetchProducts,
    fetchCustomers,
    fetchCategories,
    fetchUserProfile,
  ]);

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    console.log("🔍 [LECTOR USB] Código recibido:", barcodeInput);

    // 🔧 Normalizar el código de barras con la función centralizada
    const scannedBarcode = normalizeBarcode(barcodeInput);
    console.log("🔧 [LECTOR USB] Código normalizado:", scannedBarcode);

    if (!scannedBarcode) {
      Swal.error("Código inválido", "El código de barras no es válido");
      setBarcodeInput("");
      barcodeRef.current?.focus();
      return;
    }

    // 🔧 Buscar usando comparación normalizada
    let product = products.find((p) =>
      barcodeEquals(p.barcode, scannedBarcode),
    );

    // Si no se encuentra en productos disponibles, buscar en todos los productos
    if (!product) {
      console.log(
        "⚠️ [LECTOR USB] No encontrado en productos disponibles, buscando en todos...",
      );
      try {
        const allProducts = (await getProducts(getToken)) as Product[];
        product = allProducts.find((p) =>
          barcodeEquals(p.barcode, scannedBarcode),
        );

        // Si se encuentra pero no tiene stock
        if (product && product.stock <= 0) {
          console.log("❌ [LECTOR USB] Producto encontrado pero sin stock");
          Swal.error(
            "Producto sin stock",
            `${product.name} no tiene unidades disponibles (Stock: ${product.stock})`,
          );
          setBarcodeInput("");
          barcodeRef.current?.focus();
          return;
        }
      } catch (error) {
        console.error("Error fetching all products:", error);
      }
    }

    if (product) {
      console.log("✅ [LECTOR USB] Producto encontrado:", product.name);
      // Efecto visual de éxito
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 500);

      addToCart(product);
      setBarcodeInput("");

      // Toast pequeño y no intrusivo
      Swal.productAdded(product.name, 1);
    } else {
      console.log("❌ [LECTOR USB] Producto NO encontrado en ninguna lista");
      Swal.error(
        "Producto no encontrado",
        `El código ${scannedBarcode} no está registrado`,
      );
    }
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  const handleCameraScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    console.log("📷 [CÁMARA] Código recibido:", barcode);

    // 🔧 Normalizar el código de barras con la función centralizada
    const scannedBarcode = normalizeBarcode(barcode);
    console.log("🔧 [CÁMARA] Código normalizado:", scannedBarcode);

    if (!scannedBarcode) {
      console.log("❌ [CÁMARA] Código inválido después de normalizar");
      Swal.error("Código inválido", "El código de barras no es válido");
      setTimeout(() => setLastCameraScannedCode(""), 2000);
      return;
    }

    // Evitar procesar el mismo código dos veces seguidas
    if (scannedBarcode === lastCameraScannedCode) {
      console.log("⏭️ [CÁMARA] Código ya procesado, ignorando duplicado");
      return;
    }

    setLastCameraScannedCode(scannedBarcode);

    // 🔧 Buscar usando comparación normalizada
    console.log(
      "🔍 [CÁMARA] Productos disponibles para buscar:",
      products.length,
    );
    console.log(
      "🔍 [CÁMARA] Códigos disponibles:",
      products.map((p) => ({
        nombre: p.name,
        codigo: p.barcode,
        codigoNormalizado: normalizeBarcode(p.barcode),
      })),
    );

    let product = products.find((p) =>
      barcodeEquals(p.barcode, scannedBarcode),
    );

    // Si no se encuentra en productos disponibles, buscar en todos los productos
    if (!product) {
      console.log(
        "⚠️ [CÁMARA] No encontrado en productos disponibles, buscando en TODOS...",
      );
      try {
        const allProducts = (await getProducts(getToken)) as Product[];
        console.log(
          "🔍 [CÁMARA] Total de productos en sistema:",
          allProducts.length,
        );
        console.log(
          "🔍 [CÁMARA] Todos los códigos:",
          allProducts.map((p) => ({
            nombre: p.name,
            codigo: p.barcode,
            stock: p.stock,
            codigoNormalizado: normalizeBarcode(p.barcode),
          })),
        );

        product = allProducts.find((p) =>
          barcodeEquals(p.barcode, scannedBarcode),
        );

        // Si se encuentra pero no tiene stock
        if (product && product.stock <= 0) {
          console.log(
            "❌ [CÁMARA] Producto encontrado pero sin stock:",
            product.name,
          );
          Swal.error(
            "Producto sin stock",
            `${product.name} no tiene unidades disponibles (Stock: ${product.stock})`,
          );
          setTimeout(() => setLastCameraScannedCode(""), 2000);
          return;
        }
      } catch (error) {
        console.error("Error fetching all products:", error);
      }
    }

    if (product) {
      console.log("✅ [CÁMARA] Producto encontrado:", product.name);
      // Efecto visual de éxito
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 500);

      addToCart(product);

      // Toast pequeño y no intrusivo
      Swal.productAdded(product.name, 1);

      // Cerrar el escáner después de agregar el producto
      setTimeout(() => {
        setShowCameraScanner(false);
        // Resetear el último código escaneado después de cerrar
        setTimeout(() => setLastCameraScannedCode(""), 1000);
      }, 500);
    } else {
      console.log("❌ [CÁMARA] Producto NO encontrado en ninguna lista");
      Swal.error(
        "Producto no encontrado",
        `El código ${scannedBarcode} no está registrado`,
      );
      // También resetear el código en caso de error
      setTimeout(() => setLastCameraScannedCode(""), 2000);
    }
  };

  const addToCart = (
    product: Product,
    quantity: number = 1,
    isUnitSale: boolean | undefined = undefined,
  ) => {
    console.log('🛒 addToCart called:', {
      product: product.name,
      quantity,
      isUnitSale,
      sell_by_unit: product.sell_by_unit
    });

    // Si el producto se vende por unidades y no se especificó explícitamente el tipo de venta, abrir modal
    // isUnitSale === undefined significa que se llamó desde la lista de productos
    if (product.sell_by_unit && isUnitSale === undefined) {
      console.log('📱 Opening unit selector modal (isUnitSale not specified)');
      setSelectedProductForUnits(product);
      setShowUnitSelector(true);
      return;
    }

    // Si isUnitSale es undefined pero el producto no se vende por unidades, usar false por defecto
    const finalIsUnitSale = isUnitSale ?? false;

    console.log('➕ Adding to cart...', { finalIsUnitSale });
    setCart((prev) => {
      // Buscar si ya existe en el carrito (del mismo tipo: paquete o unidad)
      const existing = prev.find(
        (item) =>
          item.product.id === product.id && item.isUnitSale === finalIsUnitSale,
      );

      // Calcular precio efectivo y stock disponible
      const unitsPerPackage = product.units_per_package || 1;
      const pricePerUnit =
        product.price_per_unit || product.sale_price / unitsPerPackage;
      const effectivePrice = finalIsUnitSale ? pricePerUnit : product.sale_price;
      const availableStock = finalIsUnitSale
        ? Math.floor(product.stock * unitsPerPackage)  // Unidades disponibles
        : Math.floor(product.stock);  // Paquetes completos disponibles

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (newQuantity > availableStock) {
          Swal.warning(
            "Cantidad insuficiente",
            `Solo hay ${availableStock} ${finalIsUnitSale ? product.unit_name || "unidades" : product.package_name || "paquetes"} disponibles`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id && item.isUnitSale === finalIsUnitSale
            ? { ...item, quantity: newQuantity }
            : item,
        );
      }

      // Verificar si el producto tiene una oferta activa
      const offer = getProductOffer(product.id);
      const hasOffer = offer && offer.discount_percentage > 0;
      const originalPrice = product.sale_price;
      const discountPercentage = hasOffer ? offer!.discount_percentage : 0;

      // Aplicar descuento si existe
      const productWithOffer = hasOffer
        ? getProductWithOffer(product)
        : product;

      return [
        ...prev,
        {
          product: productWithOffer,
          quantity: quantity,
          originalPrice: hasOffer ? originalPrice : undefined,
          discountPercentage: hasOffer ? discountPercentage : undefined,
          hasOffer: hasOffer,
          isUnitSale: finalIsUnitSale,
          effectivePrice,
        },
      ];
    });
  };

  const handleUnitSelectorConfirm = (quantity: number, isUnitSale: boolean) => {
    console.log('✅ Unit selector confirmed:', {
      product: selectedProductForUnits?.name,
      quantity,
      isUnitSale
    });

    if (selectedProductForUnits) {
      addToCart(selectedProductForUnits, quantity, isUnitSale);
      setShowUnitSelector(false);
      setSelectedProductForUnits(null);

      // Toast de confirmación
      const unitName = isUnitSale
        ? selectedProductForUnits.unit_name || "unidad"
        : selectedProductForUnits.package_name || "paquete";
      Swal.productAdded(
        `${selectedProductForUnits.name} (${quantity} ${unitName}${quantity > 1 ? "s" : ""})`,
        quantity
      );
    }
  };

  const updateQuantity = (productId: string, delta: number, isUnitSale: boolean = false) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.isUnitSale === isUnitSale) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;

          // Calcular stock disponible según el tipo de venta
          const unitsPerPackage = item.product.units_per_package || 1;
          const availableStock = item.isUnitSale
            ? Math.floor(item.product.stock * unitsPerPackage)
            : Math.floor(item.product.stock);

          if (newQuantity > availableStock) {
            const unitLabel = item.isUnitSale
              ? item.product.unit_name || "unidades"
              : item.product.package_name || "paquetes";
            Swal.warning(
              "Cantidad insuficiente",
              `Solo hay ${availableStock} ${unitLabel} disponibles`,
            );
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    );
  };

  const setDirectQuantity = (productId: string, quantity: number, isUnitSale: boolean = false) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.isUnitSale === isUnitSale) {
          if (quantity <= 0) {
            Swal.warning("Cantidad inválida", "La cantidad debe ser mayor a 0");
            return item;
          }

          // Calcular stock disponible según el tipo de venta
          const unitsPerPackage = item.product.units_per_package || 1;
          const availableStock = item.isUnitSale
            ? Math.floor(item.product.stock * unitsPerPackage)
            : Math.floor(item.product.stock);

          if (quantity > availableStock) {
            const unitLabel = item.isUnitSale
              ? item.product.unit_name || "unidades"
              : item.product.package_name || "paquetes";
            Swal.warning(
              "Cantidad insuficiente",
              `Solo hay ${availableStock} ${unitLabel} disponibles`,
            );
            return { ...item, quantity: availableStock };
          }
          return { ...item, quantity };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string, isUnitSale: boolean = false) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.isUnitSale === isUnitSale)));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => {
      const price = item.effectivePrice || item.product.sale_price;
      return sum + price * item.quantity;
    }, 0);
    return subtotal - discountAmount;
  };

  const processSale = async () => {
    if (cart.length === 0) {
      Swal.warning(
        "El carrito está vacío",
        "Agrega productos antes de procesar la venta",
      );
      return;
    }

    // Validar venta a crédito
    if (paymentMethod === "credito") {
      if (!selectedCustomer) {
        Swal.warning(
          "Cliente requerido",
          "Debes seleccionar un cliente para vender a crédito",
        );
        return;
      }

      const total = calculateTotal();
      const creditCheck = await canCustomerGetCredit(
        selectedCustomer.id,
        total,
        getToken,
      );

      if (!creditCheck.canGetCredit) {
        Swal.error(
          "Crédito no disponible",
          creditCheck.message || "Este cliente no puede recibir más crédito",
        );
        return;
      }
    }

    setProcessing(true);
    try {
      // Obtener user_profile del usuario actual
      let userProfile = null;
      try {
        userProfile = await getUserProfile(getToken);
      } catch (error) {
        console.error("User profile not found:", error);
        Swal.error(
          "Error",
          "Perfil de usuario no encontrado. Asegúrate de haber iniciado sesión correctamente.",
        );
        setProcessing(false);
        return;
      }

      if (!userProfile || !userProfile.id) {
        Swal.error(
          "Perfil inválido",
          "No se pudo obtener información del usuario autenticado.",
        );
        setProcessing(false);
        return;
      }

      const subtotal = cart.reduce(
        (sum, item) => sum + item.product.sale_price * item.quantity,
        0,
      );
      // El número de venta se genera automáticamente en la API de Cloudflare

      // Canjear puntos por descuento si aplica
      let appliedDiscount = 0;
      let pointsRedeemed = 0;
      if (selectedCustomer && applyDiscount) {
        const redeemResult = await redeemPointsForDiscount(
          selectedCustomer.id,
          subtotal,
          getToken,
        );
        appliedDiscount = redeemResult.discount;
        pointsRedeemed = redeemResult.pointsRedeemed;
      }

      const total = subtotal - appliedDiscount;

      // Calcular puntos si hay un cliente seleccionado (después de aplicar descuento)
      // NOTA: En ventas a crédito, los puntos NO se asignan hasta que se pague completamente
      let pointsEarned = 0;
      let pointsToAssignNow = 0;

      if (selectedCustomer) {
        // Calcular puntos basados en el total de la compra
        pointsEarned = await calculatePointsForPurchase(userProfile.id, total);

        // Solo asignar puntos inmediatamente si NO es venta a crédito
        if (paymentMethod !== "credito") {
          pointsToAssignNow = pointsEarned;
        } else {
          // En ventas a crédito, guardamos los puntos en la venta
          // pero NO los asignamos al cliente hasta que se pague completamente
          pointsToAssignNow = 0;
        }
      }

      // Crear la venta
      type SaleItemCreate = {
        product_id: string;
        quantity: number;
        unit_price: number;
        discount: number;
        subtotal: number;
      };

      type SalePayload = Partial<Sale> & { items?: SaleItemCreate[] };

      const saleData: SalePayload = {
        // sale_number se genera automáticamente en la API
        cashier_id: userProfile.id,
        customer_id: selectedCustomer?.id ?? undefined,
        subtotal: subtotal,
        tax: 0,
        discount: appliedDiscount,
        total: total,
        payment_method: paymentMethod,
        status: paymentMethod === "credito" ? "pendiente" : "completada",
        points_earned: pointsEarned || 0,
        notes: undefined,
      };

      // Campos específicos para ventas a crédito
      if (paymentMethod === "credito") {
        saleData.payment_status = "pendiente";
        saleData.amount_paid = 0;
        saleData.amount_pending = total;
        // Fecha de vencimiento: 30 días desde hoy
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        saleData.due_date = dueDate.toISOString();
      } else {
        saleData.payment_status = undefined;
        saleData.amount_paid = undefined;
        saleData.amount_pending = undefined;
        saleData.due_date = undefined;
      }

      // Agregar items a la venta (la API de Cloudflare los crea automáticamente)
      const itemsPayload = cart.map((cartItem) => {
        // Calcular el descuento por oferta si existe
        const price = cartItem.effectivePrice || cartItem.product.sale_price;
        const itemDiscount =
          cartItem.hasOffer && cartItem.originalPrice
            ? (cartItem.originalPrice - price) * cartItem.quantity
            : 0;

        // Calcular cantidad real a descontar del inventario
        // Si se vende por unidades, convertir a paquetes
        const unitsPerPackage = cartItem.product.units_per_package || 1;
        const quantityToDiscount = cartItem.isUnitSale
          ? cartItem.quantity / unitsPerPackage
          : cartItem.quantity;

        return {
          product_id: cartItem.product.id,
          quantity: quantityToDiscount, // Cantidad en paquetes
          unit_price: price,
          discount: itemDiscount,
          subtotal: price * cartItem.quantity,
        };
      });
      saleData.items = itemsPayload;

      // Validación básica antes de enviar al API para evitar errores de D1 por valores undefined
      if (
        !saleData.total ||
        !saleData.payment_method ||
        !Array.isArray(saleData.items) ||
        saleData.items!.length === 0
      ) {
        Swal.error(
          "Datos de venta inválidos",
          "Faltan campos requeridos (total, payment_method o items)",
        );
        setProcessing(false);
        return;
      }

      for (const item of saleData.items!) {
        if (
          !item.product_id ||
          typeof item.quantity !== "number" ||
          item.quantity <= 0 ||
          typeof item.unit_price !== "number" ||
          typeof item.subtotal !== "number"
        ) {
          Swal.error(
            "Datos de producto inválidos",
            "Revisa los productos en el carrito (id, cantidad o precio inválidos)",
          );
          setProcessing(false);
          return;
        }
      }

      const sale = await createSale(
        saleData as unknown as Partial<Sale>,
        getToken,
      );

      // Actualizar el stock de los productos
      for (const cartItem of cart) {
        // Calcular cuánto descontar del stock según si es venta por unidades o paquetes
        let newStock: number;

        if (cartItem.isUnitSale) {
          // Si se vende por unidades, convertir las unidades vendidas a paquetes
          const unitsPerPackage = cartItem.product.units_per_package || 1;
          const unitsSold = cartItem.quantity; // unidades vendidas
          const packagesSold = unitsSold / unitsPerPackage; // paquetes equivalentes

          // Descontar del stock (que está en paquetes)
          newStock = cartItem.product.stock - packagesSold;

          console.log('🔄 Venta por unidades:', {
            producto: cartItem.product.name,
            stockAnterior: cartItem.product.stock,
            unidadesVendidas: unitsSold,
            unidadesPorPaquete: unitsPerPackage,
            paquetesDescontados: packagesSold,
            nuevoStock: newStock,
            unidadesRestantes: newStock * unitsPerPackage
          });
        } else {
          // Si se vende por paquetes, descontar directamente
          newStock = cartItem.product.stock - cartItem.quantity;

          console.log('📦 Venta por paquetes:', {
            producto: cartItem.product.name,
            stockAnterior: cartItem.product.stock,
            paquetesVendidos: cartItem.quantity,
            nuevoStock: newStock
          });
        }

        await updateProduct(
          cartItem.product.id,
          {
            stock: newStock,
          },
          getToken,
        );

        // TODO: Implementar API endpoint para inventory_movements
        // Por ahora la cantidad se actualiza pero no se registra el movimiento de inventario
        // Esto se puede implementar más adelante creando una ruta /api/inventory-movements
      }

      // Asignar puntos al cliente si aplica (solo para ventas NO a crédito)
      let customerReachedRewardThreshold = false;
      let customerNewPoints = 0;

      if (selectedCustomer && pointsToAssignNow > 0) {
        await addPointsToCustomer(
          selectedCustomer.id,
          pointsToAssignNow,
          getToken,
        );

        // Verificar si el cliente alcanzó el umbral para obtener descuento
        const updatedCustomer = await getCustomerById(
          selectedCustomer.id,
          getToken,
        );
        customerNewPoints = updatedCustomer.loyalty_points || 0;

        // Si el cliente ahora tiene >= 100 puntos y antes tenía < 100, alcanzó el umbral
        const previousPoints = selectedCustomer.loyalty_points || 0;
        const REWARD_THRESHOLD = REWARD_CONSTANTS.POINTS_FOR_DISCOUNT;

        if (
          previousPoints < REWARD_THRESHOLD &&
          customerNewPoints >= REWARD_THRESHOLD
        ) {
          customerReachedRewardThreshold = true;
        }
      }

      // Actualizar deuda del cliente si es venta a crédito
      if (paymentMethod === "credito" && selectedCustomer) {
        await updateCustomerDebt(selectedCustomer.id, total, getToken);
      }

      // Mostrar notificación especial si el cliente alcanzó el umbral de recompensa
      if (customerReachedRewardThreshold && selectedCustomer) {
        await Swal.custom({
          icon: "success",
          title: "🎉 ¡Cliente Alcanzó Recompensa!",
          html: `
            <div class="text-left space-y-3">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                <p class="text-lg font-bold text-yellow-800 mb-2">
                  🏆 ${selectedCustomer.name}
                </p>
                <p class="text-sm text-gray-700 mb-2">
                  Ahora tiene <strong class="text-yellow-600">${customerNewPoints} puntos acumulados</strong>
                </p>
                <p class="text-sm text-green-700 font-semibold">
                  ✓ Ya puede canjear un descuento del ${REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}% en su próxima compra
                </p>
              </div>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-600">
                <p><strong>Recuerda:</strong> El cliente puede canjear ${REWARD_CONSTANTS.POINTS_FOR_DISCOUNT} puntos por un ${REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}% de descuento en su próxima compra.</p>
              </div>
            </div>
          `,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#EAB308",
          timer: 8000,
          timerProgressBar: true,
        });
      }

      // Verificar si hay productos con descuento por oferta
      const itemsWithOffer = cart.filter((item) => item.hasOffer);
      const totalOfferDiscount = itemsWithOffer.reduce((sum, item) => {
        if (item.originalPrice) {
          return (
            sum + (item.originalPrice - item.product.sale_price) * item.quantity
          );
        }
        return sum;
      }, 0);

      // Mostrar mensaje personalizado - SIEMPRE con opción de factura
      let htmlContent = `
        <p class="text-lg mb-2">Venta #${sale.sale_number}</p>
      `;

      // Mostrar información de productos con ofertas
      if (itemsWithOffer.length > 0) {
        htmlContent += `
          <div class="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mb-3">
            <p class="text-sm font-bold text-orange-800 mb-2">🏷️ Descuentos Aplicados</p>
            <div class="space-y-1">
        `;
        itemsWithOffer.forEach((item) => {
          const itemDiscount = item.originalPrice
            ? (item.originalPrice - item.product.sale_price) * item.quantity
            : 0;
          htmlContent += `
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-700">
                ${item.product.name} <span class="font-semibold text-orange-600">(-${item.discountPercentage}%)</span>
              </span>
              <span class="text-orange-700 font-semibold">-${formatCurrency(itemDiscount)}</span>
            </div>
          `;
        });
        htmlContent += `
            </div>
            <div class="mt-2 pt-2 border-t border-orange-200 flex justify-between text-sm font-bold">
              <span class="text-orange-800">Total Ahorrado:</span>
              <span class="text-orange-600">${formatCurrency(totalOfferDiscount)}</span>
            </div>
          </div>
        `;
      }

      // Agregar información de cliente si existe
      if (selectedCustomer) {
        htmlContent += `
          ${
            appliedDiscount > 0
              ? `
            <div class="bg-gray-50 p-2 rounded mb-2 text-sm">
              <p class="text-gray-600">Subtotal: ${formatCurrency(subtotal)}</p>
              <p class="text-green-600 font-semibold">Descuento (${
                REWARD_CONSTANTS.DISCOUNT_PERCENTAGE
              }%): -${formatCurrency(appliedDiscount)}</p>
              <p class="text-xs text-gray-500 mt-1">Se canjearon ${pointsRedeemed} puntos</p>
            </div>
          `
              : ""
          }
          <p class="text-2xl font-bold text-green-600 mb-3">Total: ${formatCurrency(
            total,
          )}</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
            <p class="text-sm text-gray-600">Cliente: <strong>${
              selectedCustomer.name
            }</strong></p>
          </div>
        `;

        if (pointsEarned > 0) {
          if (paymentMethod === "credito") {
            // Para ventas a crédito, mostrar que los puntos se asignarán al pagar
            htmlContent += `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                <p class="text-sm font-bold text-yellow-600">⏳ ${pointsEarned} puntos pendientes</p>
                <p class="text-xs text-gray-600 mt-1">Se asignarán cuando se complete el pago</p>
              </div>
            `;
          } else {
            // Para ventas normales, mostrar que los puntos ya se asignaron
            htmlContent += `
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                <p class="text-lg font-bold text-yellow-600">+${pointsEarned} puntos ganados</p>
              </div>
            `;

            // Agregar mensaje de hito si aplica
            const milestoneMessage = getPointsMilestoneMessage(pointsEarned);
            if (milestoneMessage) {
              htmlContent += `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p class="text-green-800">${milestoneMessage}</p>
                </div>
              `;
            }
          }
        }

        // Agregar mensaje especial para ventas a crédito
        if (paymentMethod === "credito") {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          htmlContent += `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
              <p class="text-sm font-semibold text-orange-800">💳 Venta a Crédito</p>
              <p class="text-xs text-gray-600 mt-1">Fecha de vencimiento: ${dueDate.toLocaleDateString(
                "es-CO",
              )}</p>
            </div>
          `;
        }
      } else {
        // Sin cliente seleccionado
        htmlContent += `
          <p class="text-2xl font-bold text-green-600 mb-3">Total: ${formatCurrency(
            total,
          )}</p>
        `;
      }

      // Agregar botón para generar factura (PARA TODAS LAS VENTAS)
      htmlContent += `
        <div class="mt-4 pt-3 border-t border-gray-200">
          <button id="generate-invoice-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded flex items-center justify-center gap-2">
            📄 Generar Factura
          </button>
        </div>
      `;

      await Swal.custom({
        title:
          paymentMethod === "credito"
            ? "Venta a Crédito Registrada"
            : "Venta Completada",
        html: htmlContent,
        icon: "success",
        confirmButtonText: "Aceptar",
        didOpen: () => {
          // Agregar evento al botón de factura
          const invoiceBtn = document.getElementById("generate-invoice-btn");
          if (invoiceBtn) {
            invoiceBtn.addEventListener("click", () => {
              // Cerrar el SweetAlert y abrir el modal de factura
              Swal.close();
              // Guardar la información de la venta para la factura
              setLastSale(sale);
              // Construir los items con la información del producto
              const saleItemsWithProducts: SaleItemWithProduct[] = cart.map(
                (cartItem) => ({
                  id: "", // Se genera en la API
                  user_profile_id: (sale as Sale).user_profile_id,
                  sale_id: sale.id,
                  product_id: cartItem.product.id,
                  quantity: cartItem.quantity,
                  unit_price: cartItem.product.sale_price,
                  discount: 0,
                  subtotal: cartItem.product.sale_price * cartItem.quantity,
                  created_at: new Date().toISOString(),
                  product: cartItem.product,
                }),
              );
              setLastSaleItems(saleItemsWithProducts);
              setLastSaleCustomer(selectedCustomer);
              setShowInvoiceModal(true);
            });
          }
        },
      });

      // Limpiar el carrito y estados
      setCart([]);
      setSelectedCustomer(null);
      setCanRedeem(false);
      setApplyDiscount(false);
      setDiscountAmount(0);
      fetchProducts(); // Actualizar inventario
      barcodeRef.current?.focus();
    } catch (error) {
      console.error("Error processing sale:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar la venta";
      Swal.error(errorMessage, "Error en la venta");
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Modal cuando NO hay productos en el sistema (no solo sin stock)
  if (!hasAnyProducts) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Bienvenido al Punto de Venta!
            </h2>
            <p className="text-gray-600">
              Para comenzar a vender, primero necesitas agregar productos a tu
              inventario.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard/products/new"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Plus className="inline-block h-5 w-5 mr-2 -mt-1" />
              Crear Mi Primer Producto
            </Link>

            <button
              onClick={async () => {
                const response = await fetch("/api/seed-products", {
                  method: "POST",
                });
                const data = await response.json();
                if (response.ok) {
                  Swal.success("¡Productos creados!", data.message);
                  fetchProducts();
                } else {
                  Swal.error(
                    "Error",
                    data.error || "No se pudieron crear productos de ejemplo",
                  );
                }
              }}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Package className="inline-block h-5 w-5 mr-2 -mt-1" />
              Crear Productos de Ejemplo
            </button>

            <Link
              href="/dashboard/products"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Ver Todos los Productos
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              💡 <strong>Consejo:</strong> Puedes crear productos de ejemplo
              para probar el sistema rápidamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Punto de Venta</h1>
        {/* COMENTADO: Botón de ayuda/tour deshabilitado
        <Button
          variant="outline"
          size="sm"
          onClick={startTour}
          title="Ver guía interactiva"
        >
          <HelpCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
        */}
      </div>

      {/* Modal del escáner de cámara */}
      {showCameraScanner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <BarcodeScannerZXing
              onDetected={handleCameraScan}
              onClose={() => setShowCameraScanner(false)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Panel izquierdo - Productos */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          {/* Búsqueda por código de barras */}
          <Card
            className={`border-2 shadow-lg transition-all duration-300 ${
              scanSuccess
                ? "border-green-500 bg-green-50"
                : "border-blue-500 bg-linear-to-r from-blue-50 to-white"
            }`}
          >
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      scanSuccess ? "bg-green-600" : "bg-blue-600"
                    }`}
                  >
                    <Scan className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">
                      {scanSuccess
                        ? "✓ Producto Agregado"
                        : "Escanear Producto"}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {scanSuccess
                        ? "Escanea el siguiente producto"
                        : "Selecciona tu método de escaneo"}
                    </p>
                  </div>
                </div>

                {/* Botones de selección de método de escaneo */}
                {!showBarcodeInput && !showCameraScanner && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        setShowBarcodeInput(true);
                        // Auto-enfocar el input después de un pequeño delay
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }}
                      className="h-20 md:h-24 bg-blue-600 hover:bg-blue-700 transition-colors flex-col gap-2"
                      title="Escanear con lector USB"
                    >
                      <Scan className="h-6 w-6 md:h-8 md:w-8" />
                      <div className="text-center">
                        <div className="text-sm md:text-base font-semibold">
                          Lector USB
                        </div>
                        {/* <div className="text-xs opacity-90">Conectado</div> */}
                      </div>
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setShowCameraScanner(true)}
                      className="h-20 md:h-24 bg-purple-600 hover:bg-purple-700 transition-colors flex-col gap-2"
                      title="Escanear con cámara"
                    >
                      <Camera className="h-6 w-6 md:h-8 md:w-8" />
                      <div className="text-center">
                        <div className="text-sm md:text-base font-semibold">
                          Cámara
                        </div>
                        <div className="text-xs opacity-90">
                          Del dispositivo
                        </div>
                      </div>
                    </Button>
                  </div>
                )}

                {/* Formulario de escaneo con lector USB */}
                {showBarcodeInput && (
                  <form onSubmit={handleBarcodeSearch} className="space-y-3">
                    {/* Input de código de barras */}
                    <div className="relative">
                      <Input
                        ref={barcodeRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Escanea aquí el código de barras..."
                        className={`h-12 md:h-14 text-xs md:text-sm font-mono tracking-wider border-2 focus:ring-2 pl-10 md:pl-12 transition-colors ${
                          scanSuccess
                            ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                            : "border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                        }`}
                        autoComplete="off"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Scan
                          className={`h-5 w-5 md:h-6 md:w-6 ${
                            scanSuccess
                              ? "text-green-600"
                              : "text-blue-600 animate-pulse"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setShowBarcodeInput(false);
                          setBarcodeInput("");
                        }}
                        className="flex-1 h-11 md:h-14"
                      >
                        <X className="h-5 w-5 mr-2" />
                        <span className="text-sm md:text-base">Cancelar</span>
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className={`flex-1 h-11 md:h-14 transition-colors ${
                          scanSuccess
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        <Search className="h-5 w-5 mr-2" />
                        <span className="text-sm md:text-base">Agregar</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          scanSuccess
                            ? "bg-green-500 animate-ping"
                            : "bg-green-500"
                        }`}
                      ></div>
                      <span>
                        {scanSuccess
                          ? "Producto agregado al carrito"
                          : "Listo para escanear - Presiona Enter o click en Agregar"}
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Búsqueda de productos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos..."
                  className="pl-10 text-sm md:text-base"
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros de categoría */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
                    selectedCategory === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const offer = getProductOffer(product.id);
                    const hasOffer = offer && offer.discount_percentage > 0;
                    const originalPrice = product.sale_price;
                    const discountedPrice = hasOffer
                      ? product.sale_price -
                        (product.sale_price * offer.discount_percentage) / 100
                      : product.sale_price;

                    return (
                      <Card
                        key={product.id}
                        className={`cursor-pointer hover:border-blue-500 transition-colors ${hasOffer ? "border-2 border-orange-400" : ""}`}
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-2 md:p-4">
                          {/* Imagen del producto */}
                          <div className="relative w-full aspect-square mb-2 bg-gray-50 rounded-md overflow-hidden">
                            {hasOffer && (
                              <div className="absolute top-0 right-0 z-10 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-bl-md">
                                -{offer.discount_percentage}%
                              </div>
                            )}
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-contain p-2"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 md:h-12 md:w-12 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-medium text-xs md:text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h4>
                          <div>
                            {hasOffer ? (
                              <>
                                <p className="text-xs text-gray-400 line-through">
                                  {formatCurrency(originalPrice)}
                                </p>
                                <p className="text-sm md:text-lg font-bold text-orange-600">
                                  {formatCurrency(discountedPrice)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm md:text-lg font-bold text-blue-600">
                                {formatCurrency(product.sale_price)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Disponible: {
                              product.sell_by_unit
                                ? `${Math.floor(product.stock * (product.units_per_package || 1))} ${product.unit_name || 'unidades'}`
                                : `${product.stock} ${product.package_name || 'unidades'}`
                            }
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No hay productos disponibles
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {searchTerm || selectedCategory !== "all"
                        ? "Intenta cambiar los filtros de búsqueda"
                        : "Todos tus productos están sin stock"}
                    </p>
                    {!searchTerm && selectedCategory === "all" && (
                      <Link
                        href="/dashboard/products"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                      >
                        Ver todos los productos
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Carrito */}
        <div className="space-y-4 order-1 lg:order-2">
          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                Carrito ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Selector de Cliente */}
              <div className="mb-4 pb-4 border-b">
                {selectedCustomer ? (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              {selectedCustomer.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              {selectedCustomer.loyalty_points} puntos
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCanRedeem(false);
                            setApplyDiscount(false);
                            setDiscountAmount(0);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Opción de canjear puntos */}
                    {canRedeem && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyDiscount}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setApplyDiscount(checked);

                              if (checked) {
                                const total = cart.reduce(
                                  (sum, item) =>
                                    sum +
                                    item.product.sale_price * item.quantity,
                                  0,
                                );
                                const discount = Math.round(
                                  total *
                                    (REWARD_CONSTANTS.DISCOUNT_PERCENTAGE /
                                      100),
                                );
                                setDiscountAmount(discount);
                              } else {
                                setDiscountAmount(0);
                              }
                            }}
                            className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">
                              Canjear {REWARD_CONSTANTS.POINTS_FOR_DISCOUNT}{" "}
                              puntos por {REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}%
                              de descuento
                            </p>
                            <p className="text-xs text-yellow-700">
                              {applyDiscount
                                ? `Descuento: ${formatCurrency(discountAmount)}`
                                : "Marca para aplicar descuento"}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Nuevo diseño con cuadro naranja/tomate */}
                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-400 rounded-lg p-4 relative overflow-hidden">
                      {/* Icono de persona en el fondo */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-10">
                        <User className="h-20 w-20 text-orange-600" />
                      </div>

                      {/* Contenido */}
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-orange-600 rounded-full">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-orange-900">
                              Seleccionar Cliente
                            </p>
                            <p className="text-xs text-orange-700">Opcional</p>
                          </div>
                        </div>

                        {/* Botón de tamaño reducido (50% del ancho del cuadro) */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-1/2 mx-auto block bg-white hover:bg-orange-50 border-orange-400 text-orange-900 font-semibold"
                          onClick={() =>
                            setShowCustomerSearch(!showCustomerSearch)
                          }
                        >
                          {showCustomerSearch ? "Cerrar" : "Seleccionar"}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center mt-2">
                      Puedes vender sin seleccionar cliente
                    </p>

                    {showCustomerSearch && (
                      <div className="mt-2 space-y-2">
                        <Input
                          placeholder="Buscar cliente..."
                          value={customerSearchTerm}
                          onChange={(e) =>
                            setCustomerSearchTerm(e.target.value)
                          }
                          className="text-sm"
                        />

                        {/* Botón para crear nuevo cliente */}
                        {!showNewCustomerForm && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setShowNewCustomerForm(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear Nuevo Cliente
                          </Button>
                        )}

                        {/* Formulario de creación de cliente */}
                        {showNewCustomerForm && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-gray-700">
                                Nuevo Cliente
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowNewCustomerForm(false);
                                  setNewCustomerData({
                                    name: "",
                                    phone: "",
                                    email: "",
                                  });
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Nombre *"
                              value={newCustomerData.name}
                              onChange={(e) =>
                                setNewCustomerData({
                                  ...newCustomerData,
                                  name: e.target.value,
                                })
                              }
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Teléfono"
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={newCustomerData.phone}
                              onChange={(e) =>
                                setNewCustomerData({
                                  ...newCustomerData,
                                  phone: e.target.value,
                                })
                              }
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={newCustomerData.email}
                              onChange={(e) =>
                                setNewCustomerData({
                                  ...newCustomerData,
                                  email: e.target.value,
                                })
                              }
                              className="text-xs h-8"
                            />
                            <Button
                              size="sm"
                              className="w-full text-xs h-8"
                              onClick={handleCreateCustomer}
                            >
                              Crear Cliente
                            </Button>
                          </div>
                        )}

                        {/* Lista de clientes con scroll mejorado */}
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {customers
                            .filter(
                              (c) =>
                                c.name
                                  .toLowerCase()
                                  .includes(customerSearchTerm.toLowerCase()) ||
                                c.phone?.includes(customerSearchTerm) ||
                                c.email
                                  ?.toLowerCase()
                                  .includes(customerSearchTerm.toLowerCase()),
                            )
                            .slice(0, 10)
                            .map((customer) => (
                              <button
                                key={customer.id}
                                onClick={async () => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerSearch(false);
                                  setCustomerSearchTerm("");
                                  setShowNewCustomerForm(false);

                                  // Verificar si el cliente puede canjear puntos
                                  const eligible = await canRedeemDiscount(
                                    customer.id,
                                    getToken,
                                  );
                                  setCanRedeem(eligible);
                                  setApplyDiscount(false);
                                  setDiscountAmount(0);
                                }}
                                className="w-full text-left p-2 hover:bg-gray-100 rounded text-xs"
                              >
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-gray-500">
                                  {customer.phone || customer.email}
                                </p>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-6 md:py-8 text-sm">
                    Carrito vacío
                  </p>
                ) : (
                  cart.map((item) => {
                    const price =
                      item.effectivePrice || item.product.sale_price;
                    const unitLabel = item.isUnitSale
                      ? item.product.unit_name || "unidad"
                      : item.product.package_name || "paquete";

                    return (
                      <div
                        key={`${item.product.id}-${item.isUnitSale ? "unit" : "package"}`}
                        className={`p-3 md:p-4 border-2 rounded-lg ${item.hasOffer ? "bg-orange-50 border-orange-300" : "border-gray-300"}`}
                      >
                        {/* Primera fila: Nombre, precio y cantidad */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-base md:text-lg flex-1">
                              {item.product.name}
                              {item.isUnitSale && (
                                <span className="ml-2 text-xs md:text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {unitLabel}es sueltos
                                </span>
                              )}
                            </p>
                            {item.hasOffer && (
                              <span className="text-sm md:text-base bg-orange-600 text-white px-2 py-1 rounded font-bold">
                                -{item.discountPercentage}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            {item.hasOffer && item.originalPrice && (
                              <span className="text-base md:text-lg text-gray-400 line-through">
                                {formatCurrency(item.originalPrice)}
                              </span>
                            )}
                            <span
                              className={`font-bold text-lg md:text-xl ${item.hasOffer ? "text-orange-600" : "text-blue-600"}`}
                            >
                              {formatCurrency(price)}
                            </span>
                            <span className="text-base md:text-lg text-gray-600">
                              x {item.quantity} {unitLabel}
                              {item.quantity > 1 ? "s" : ""}
                            </span>
                            <span
                              className={`ml-auto font-bold text-lg md:text-xl ${item.hasOffer ? "text-orange-600" : "text-blue-600"}`}
                            >
                              = {formatCurrency(price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        {/* Segunda fila: Controles de cantidad y eliminar */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, -1, item.isUnitSale)}
                            className="h-12 w-12 p-0 md:h-14 md:w-14 bg-red-600  text-white border-red-600 rounded-2xl cursor-pointer hover:bg-red-700"
                          >
                            <Minus className="h-6 w-6 md:h-7 md:w-7" />
                          </Button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Permitir vacío o solo números
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "") {
                                  // Permitir campo vacío temporalmente
                                  setCart((prev) =>
                                    prev.map((cartItem) =>
                                      cartItem.product.id === item.product.id && cartItem.isUnitSale === item.isUnitSale
                                        ? { ...cartItem, quantity: 0 }
                                        : cartItem,
                                    ),
                                  );
                                } else {
                                  const val = parseInt(value);
                                  setDirectQuantity(item.product.id, val, item.isUnitSale);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // Al perder el foco, si está vacío o es 0, establecer en 1
                              if (
                                e.target.value === "" ||
                                parseInt(e.target.value) === 0
                              ) {
                                setDirectQuantity(item.product.id, 1, item.isUnitSale);
                              }
                            }}
                            onKeyDown={(e) => {
                              // Permitir borrar con backspace/delete
                              if (e.key === "Backspace" || e.key === "Delete") {
                                return;
                              }
                              // Solo permitir números y teclas de control
                              if (
                                !/\d/.test(e.key) &&
                                !["ArrowLeft", "ArrowRight", "Tab"].includes(
                                  e.key,
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                            className="flex-1 h-12 md:h-14 text-center text-[16px] md:text-3xl font-bold p-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product.id, 1, item.isUnitSale)}
                            className="h-12 w-12 p-0 md:h-14 md:w-14 bg-green-600 hover:bg-green-700 text-white border-green-600 rounded-2xl cursor-pointer"
                          >
                            <Plus className="h-6 w-6 md:h-7 md:w-7" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.product.id, item.isUnitSale)}
                            className="h-12 w-12 p-0 md:h-14 md:w-14 shrink-0 hover:bg-red-50 ml-2"
                          >
                            <Trash2 className="h-7 w-7 md:h-8 md:w-8 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-3 md:pt-4 space-y-2 md:space-y-3">
                    {discountAmount > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span>
                            {formatCurrency(
                              cart.reduce(
                                (sum, item) =>
                                  sum + item.product.sale_price * item.quantity,
                                0,
                              ),
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 font-semibold">
                          <span>
                            Descuento ({REWARD_CONSTANTS.DISCOUNT_PERCENTAGE}%):
                          </span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-base md:text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm font-medium">
                        Método de Pago:
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setPaymentMethod(
                            e.target.value as
                              | "efectivo"
                              | "tarjeta"
                              | "transferencia"
                              | "credito",
                          )
                        }
                        className="w-full h-9 md:h-10 rounded-md border border-gray-300 px-3 text-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        {/* <option value="tarjeta">Tarjeta</option> */}
                        {/* <option value="transferencia">Transferencia</option> */}
                        <option value="credito" disabled={!selectedCustomer}>
                          Crédito {!selectedCustomer && "(Requiere cliente)"}
                        </option>
                      </select>
                    </div>

                    <Button
                      className="w-full text-sm md:text-base"
                      size="lg"
                      onClick={processSale}
                      disabled={processing}
                    >
                      <DollarSign className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      {processing ? "Procesando..." : "Procesar Venta"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Factura */}
      {userProfile && lastSale && (
        <InvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          sale={lastSale}
          saleItems={lastSaleItems}
          customer={lastSaleCustomer}
          storeInfo={userProfile}
          cashierName={user?.fullName || undefined}
        />
      )}

      {/* Modal de Selección de Unidades */}
      {selectedProductForUnits && (
        <UnitSelectorModal
          product={selectedProductForUnits}
          isOpen={showUnitSelector}
          onClose={() => {
            setShowUnitSelector(false);
            setSelectedProductForUnits(null);
          }}
          onConfirm={handleUnitSelectorConfirm}
        />
      )}
    </div>
  );
}
