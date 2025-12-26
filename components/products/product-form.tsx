"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCategories,
  getSuppliers,
  createProduct,
  updateProduct,
  createCategory,
  createSupplier,
} from "@/lib/cloudflare-api";
import { Category, Supplier } from "@/lib/types";
import { toast } from "sonner";
import { Scan, Camera, X, Plus } from "lucide-react";
// import { ImageUploader } from './image-uploader'; // COMENTADO: Funcionalidad de imágenes deshabilitada
import { Html5Qrcode } from "html5-qrcode";

const productSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  supplier_id: z.string().optional(),
  cost_price: z.number().min(0, "El precio de compra debe ser mayor a 0"),
  sale_price: z.number().min(0, "El precio de venta debe ser mayor a 0"),
  stock: z
    .number()
    .int()
    .min(0, "La cantidad disponible debe ser mayor o igual a 0"),
  min_stock: z
    .number()
    .int()
    .min(0, "El mínimo disponible debe ser mayor o igual a 0"),
  expiration_date: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  productId?: string;
}

export function ProductForm({ initialData, productId }: ProductFormProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // const [productImages, setProductImages] = useState<string[]>(initialData?.images || []); // COMENTADO: Funcionalidad de imágenes deshabilitada
  const [showScanner, setShowScanner] = useState(false);
  const [showScannerOptions, setShowScannerOptions] = useState(false); // Modal con opciones de escaneo
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSupplierData, setNewSupplierData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false); // Flag para evitar múltiples escaneos
  const scannerElementId = "barcode-scanner";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {},
  });

  // Obtener la ref del register de react-hook-form
  const { ref: barcodeRegisterRef, ...barcodeRegisterRest } = register("barcode", {
    setValueAs: (value) => value?.trim() || undefined,
  });

  // Ref personalizada para el input de código de barras
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Combinar las refs (una del register y otra personalizada)
  const setBarcodeRef = (element: HTMLInputElement | null) => {
    barcodeRegisterRef(element);
    if (barcodeInputRef) {
      (barcodeInputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
    }
  };

  const startScanner = async () => {
    try {
      setIsScanning(true);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      // Configuración optimizada para detección rápida
      const config = {
        fps: 30, // Incrementado de 10 a 30 para detección más rápida
        qrbox: { width: 350, height: 150 }, // Área de escaneo más amplia
        aspectRatio: 1.7777778,
        disableFlip: false, // Permitir flip para mejor detección
        // Formatos soportados (códigos de barras comunes)
        formatsToSupport: [
          0, // QR_CODE
          5, // EAN_13 (más común en productos)
          6, // EAN_8
          7, // UPC_A
          8, // UPC_E
          9, // CODE_39
          10, // CODE_93
          11, // CODE_128
          12, // ITF (Interleaved 2 of 5)
        ],
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Código escaneado exitosamente
          // Evitar procesar múltiples veces el mismo escaneo
          if (!hasScannedRef.current) {
            hasScannedRef.current = true;
            setValue("barcode", decodedText);
            toast.success("✓ Código escaneado: " + decodedText);
            stopScanner();
          }
        },
        (errorMessage) => {
          // Errores de escaneo (normal durante el proceso)
          // No mostrar nada para evitar spam en consola
        }
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("No se pudo iniciar la cámara. Verifica los permisos.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      setIsScanning(false);
      setShowScanner(false);
    }
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleOpenScanner = () => {
    hasScannedRef.current = false; // Resetear flag al abrir el escáner
    setShowScanner(true);
    setTimeout(() => {
      startScanner();
    }, 100);
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = (await getCategories(getToken)) as Category[];
      // Ordenar por nombre manualmente
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = (await getSuppliers(getToken)) as Supplier[];
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Error al cargar proveedores");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    try {
      const newCategory = (await createCategory(
        { name: newCategoryName.trim() },
        getToken
      )) as Category;
      toast.success("Categoría creada correctamente");
      await fetchCategories();
      setValue("category_id", newCategory.id);
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error al crear la categoría");
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierData.name.trim()) {
      toast.error("El nombre del proveedor es requerido");
      return;
    }

    try {
      const supplierData: any = {
        name: newSupplierData.name.trim(),
        phone: newSupplierData.phone.trim() || undefined,
        email: newSupplierData.email.trim() || undefined,
      };
      const newSupplier = (await createSupplier(
        supplierData,
        getToken
      )) as Supplier;
      toast.success("Proveedor creado correctamente");
      await fetchSuppliers();
      setValue("supplier_id", newSupplier.id);
      setNewSupplierData({ name: "", phone: "", email: "" });
      setShowNewSupplier(false);
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast.error("Error al crear el proveedor");
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const productData: any = {
        ...data,
      };

      // Log para debugging - verificar que el código de barras esté presente
      console.log('📦 Datos del producto antes de limpiar:', productData);

      // Limpiar campos vacíos para evitar errores en la base de datos
      // Convertir strings vacíos a undefined
      if (productData.category_id === "") {
        productData.category_id = undefined;
      }
      if (productData.supplier_id === "") {
        productData.supplier_id = undefined;
      }
      if (productData.barcode === "") {
        productData.barcode = undefined;
      }
      if (productData.description === "") {
        productData.description = undefined;
      }
      if (productData.expiration_date === "") {
        productData.expiration_date = undefined;
      }

      // Log después de limpiar
      console.log('✅ Datos del producto a enviar:', productData);

      if (productId) {
        await updateProduct(productId, productData, getToken);
        toast.success("Producto actualizado correctamente");
      } else {
        await createProduct(productData, getToken);
        toast.success("Producto creado correctamente");
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode" className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-blue-600" />
                Código de Barras
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="barcode"
                    {...barcodeRegisterRest}
                    ref={setBarcodeRef}
                    placeholder="Escanea o escribe el código"
                    className="pr-10"
                    autoFocus={!productId}
                  />
                  {/* <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Scan className="h-5 w-5 text-blue-600" />
                  </div> */}
                </div>
                <Button
                  type="button"
                  onClick={() => setShowScannerOptions(true)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700"
                  size="default"
                >
                  <Scan className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline">Escanear</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Usa el lector USB o la cámara para escanear
              </p>
              {errors.barcode && (
                <p className="text-sm text-red-600">{errors.barcode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Nombre del producto"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              {...register("description")}
              className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <select
                    id="category_id"
                    {...register("category_id")}
                    className="flex-1 h-9 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    title="Crear nueva categoría"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      Nueva Categoría
                    </span>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nombre de la categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    size="sm"
                    className="w-full h-8"
                  >
                    Crear Categoría
                  </Button>
                </div>
              )}
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              {!showNewSupplier ? (
                <div className="flex gap-2">
                  <select
                    id="supplier_id"
                    {...register("supplier_id")}
                    className="flex-1 h-9 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => setShowNewSupplier(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    title="Crear nuevo proveedor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">
                      Nuevo Proveedor
                    </span>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowNewSupplier(false);
                        setNewSupplierData({ name: "", phone: "", email: "" });
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Nombre del proveedor *"
                    value={newSupplierData.name}
                    onChange={(e) =>
                      setNewSupplierData({
                        ...newSupplierData,
                        name: e.target.value,
                      })
                    }
                    className="h-8"
                  />
                  <Input
                    placeholder="Teléfono"
                    value={newSupplierData.phone}
                    onChange={(e) =>
                      setNewSupplierData({
                        ...newSupplierData,
                        phone: e.target.value,
                      })
                    }
                    className="h-8"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newSupplierData.email}
                    onChange={(e) =>
                      setNewSupplierData({
                        ...newSupplierData,
                        email: e.target.value,
                      })
                    }
                    className="h-8"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateSupplier}
                    size="sm"
                    className="w-full h-8"
                  >
                    Crear Proveedor
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios e Inventario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Precio de Compra *</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                {...register("cost_price", {
                  valueAsNumber: true,
                  setValueAs: (value) => value === "" ? 0 : Number(value)
                })}
                placeholder="0.00"
              />
              {errors.cost_price && (
                <p className="text-sm text-red-600">
                  {errors.cost_price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price">Precio de Venta *</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                {...register("sale_price", {
                  valueAsNumber: true,
                  setValueAs: (value) => value === "" ? 0 : Number(value)
                })}
                placeholder="0.00"
              />
              {errors.sale_price && (
                <p className="text-sm text-red-600">
                  {errors.sale_price.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Cantidad Disponible *</Label>
              <Input
                id="stock"
                type="number"
                {...register("stock", {
                  valueAsNumber: true,
                  setValueAs: (value) => value === "" ? 0 : Number(value)
                })}
                placeholder="0"
              />
              {errors.stock && (
                <p className="text-sm text-red-600">{errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Mínimo Disponible *</Label>
              <Input
                id="min_stock"
                type="number"
                {...register("min_stock", {
                  valueAsNumber: true,
                  setValueAs: (value) => value === "" ? 10 : Number(value)
                })}
                placeholder="10"
              />
              {errors.min_stock && (
                <p className="text-sm text-red-600">
                  {errors.min_stock.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration_date">Fecha de Vencimiento</Label>
            <Input
              id="expiration_date"
              type="date"
              {...register("expiration_date")}
            />
          </div>
        </CardContent>
      </Card>

      {/* COMENTADO: Funcionalidad de subida de imágenes deshabilitada temporalmente
      <Card>
        <CardHeader>
          <CardTitle>Imagen del Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            productId={productId}
            initialImages={productImages}
            onChange={setProductImages}
            maxImages={1}
          />
        </CardContent>
      </Card>
      */}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : productId ? "Actualizar" : "Crear"}{" "}
          Producto
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>

      {/* Modal de Opciones de Escaneo */}
      {showScannerOptions && (
        <div className="fixed inset-0  bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-blue-600" />
                  Método de Escaneo
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScannerOptions(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona cómo deseas escanear el código de barras:
                </p>

                {/* Botón Lector USB */}
                <Button
                  type="button"
                  onClick={() => {
                    setShowScannerOptions(false);
                    // Enfocar el campo para que el lector USB pueda escribir
                    setTimeout(() => {
                      barcodeInputRef.current?.focus();
                      barcodeInputRef.current?.select();
                    }, 100);
                  }}
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 flex items-center justify-start gap-4 px-6"
                >
                  <Scan className="h-8 w-8" />
                  <div className="text-left">
                    <div className="font-semibold text-base">Lector USB</div>
                    <div className="text-xs opacity-90">
                      Usa tu lector de código de barras
                    </div>
                  </div>
                </Button>

                {/* Botón Cámara */}
                <Button
                  type="button"
                  onClick={() => {
                    setShowScannerOptions(false);
                    handleOpenScanner();
                  }}
                  className="w-full h-20 bg-purple-600 hover:bg-purple-700 flex items-center justify-start gap-4 px-6"
                >
                  <Camera className="h-8 w-8" />
                  <div className="text-left">
                    <div className="font-semibold text-base">Cámara</div>
                    <div className="text-xs opacity-90">
                      Escanea con la cámara del dispositivo
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal del Escáner de Códigos de Barras - HTML5-QRCode (Optimizado) */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden">
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6" />
                <h2 className="text-xl font-bold">Escanear Código de Barras</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopScanner}
                className="text-white hover:bg-blue-700"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 text-center font-medium">
                  📱 Apunta la cámara hacia el código de barras
                </p>
                <p className="text-xs text-blue-600 text-center mt-1">
                  El código se detectará automáticamente
                </p>
              </div>

              {/* Contenedor del escáner */}
              <div
                id={scannerElementId}
                className="w-full rounded-lg overflow-hidden"
                style={{ minHeight: "300px" }}
              ></div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isScanning && (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">
                        Escaneando...
                      </span>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopScanner}
                  className="w-auto"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
