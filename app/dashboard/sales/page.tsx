"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Receipt,
  Eye,
  Download,
  FileSpreadsheet,
  Brain,
  FileText,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProducts,
  getCustomers,
  getSales,
  getAllUserProfiles,
  getUserProfile,
  deleteSale,
} from "@/lib/cloudflare-api";
import {
  SaleWithRelations,
  Sale,
  Customer,
  UserProfile,
  SaleItem,
  Product,
  SaleItemWithProduct,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

import {
  exportSalesToExcel,
  exportSalesByDateRange,
  exportSalesForPredictions,
} from "@/lib/excel-export";
import { InvoiceModal } from "@/components/sales/invoice-modal";
import Swal from "@/lib/sweetalert";
import SwalOriginal from "sweetalert2";

export default function SalesPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [sales, setSales] = useState<SaleWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, today, week, month
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithRelations | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Estados para el modal de factura
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [invoiceSaleItems, setInvoiceSaleItems] = useState<
    SaleItemWithProduct[]
  >([]);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchSales();
    fetchUserProfile();
  }, [filter]);

  const fetchUserProfile = async () => {
    try {
      const profile = await getUserProfile(getToken);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchSales = async () => {
    try {
      // Obtener todas las ventas
      let salesData = (await getSales(getToken)) as Sale[];

      // Aplicar filtros de fecha
      if (filter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        salesData = salesData.filter((sale) => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= today;
        });
      } else if (filter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        salesData = salesData.filter((sale) => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= weekAgo;
        });
      } else if (filter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        salesData = salesData.filter((sale) => {
          const saleDate = (sale.created_at as any)?.toDate
            ? (sale.created_at as any).toDate()
            : new Date(sale.created_at);
          return saleDate >= monthAgo;
        });
      }

      // Obtener datos relacionados para hacer el join manualmente
      const customers = (await getCustomers(getToken)) as Customer[];
      const userProfiles = (await getAllUserProfiles(
        getToken
      )) as UserProfile[];
      const products = (await getProducts(getToken)) as Product[];

      // Crear mapas para acceso rápido
      const customersMap = new Map(customers.map((c) => [c.id, c]));
      const userProfilesMap = new Map(userProfiles.map((u) => [u.id, u]));
      const productsMap = new Map(products.map((p) => [p.id, p]));

      // Combinar los datos - la API ya devuelve items con cada venta
      const salesWithRelations: SaleWithRelations[] = salesData.map((sale) => {
        // Agregar información del producto a cada item
        // La API de Cloudflare devuelve items con cada venta
        const saleWithItems = sale as any;
        const itemsWithProducts = (saleWithItems.items || []).map(
          (item: SaleItem) => ({
            ...item,
            product: productsMap.get(item.product_id),
          })
        );

        return {
          ...sale,
          customer: sale.customer_id
            ? customersMap.get(sale.customer_id)
            : undefined,
          cashier: userProfilesMap.get(sale.cashier_id),
          items: itemsWithProducts as any,
        };
      });

      // Ordenar por fecha de creación descendente
      salesWithRelations.sort((a, b) => {
        const dateA = (a.created_at as any)?.toDate
          ? (a.created_at as any).toDate()
          : new Date(a.created_at);
        const dateB = (b.created_at as any)?.toDate
          ? (b.created_at as any).toDate()
          : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setSales(salesWithRelations);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

  // Función para extraer información del cliente desde las notas (para ventas web)
  const extractCustomerInfoFromNotes = (notes: string) => {
    if (!notes) return null;

    const info: { name?: string; phone?: string; email?: string } = {};

    const nameMatch = notes.match(/Cliente: (.+)/);
    if (nameMatch) info.name = nameMatch[1].trim();

    const phoneMatch = notes.match(/Teléfono: (.+)/);
    if (phoneMatch) info.phone = phoneMatch[1].trim();

    const emailMatch = notes.match(/Email: (.+)/);
    if (emailMatch) info.email = emailMatch[1].trim();

    return info.name ? info : null;
  };

  const handleExportAll = () => {
    if (sales.length === 0) {
      toast.error("No hay ventas para exportar");
      return;
    }
    exportSalesToExcel(sales);
    toast.success(`Exportadas ${sales.length} ventas a Excel`);
  };

  const handleExportForPredictions = () => {
    if (sales.length === 0) {
      toast.error("No hay ventas para exportar");
      return;
    }
    exportSalesForPredictions(sales);
    toast.success("Datos exportados para análisis de predicciones");
  };

  const handleExportCustomRange = () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Selecciona ambas fechas");
      return;
    }

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999); // Incluir todo el día final

    if (startDate > endDate) {
      toast.error("La fecha inicial debe ser anterior a la final");
      return;
    }

    const filteredSales = sales.filter((sale) => {
      const saleDate = (sale.created_at as any)?.toDate
        ? (sale.created_at as any).toDate()
        : new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    if (filteredSales.length === 0) {
      toast.error("No hay ventas en ese rango de fechas");
      return;
    }

    exportSalesByDateRange(sales, startDate, endDate);
    toast.success(
      `Exportadas ${filteredSales.length} ventas del rango seleccionado`
    );
  };

  const handleShowInvoice = (sale: SaleWithRelations) => {
    setInvoiceSale(sale as Sale);
    setInvoiceSaleItems(sale.items || []);
    setInvoiceCustomer(sale.customer || null);
    setShowInvoiceModal(true);
  };

  const handleDeleteSale = async (sale: SaleWithRelations) => {
    // Construir mensaje detallado
    const itemsCount = sale.items?.length || 0;
    let warningMessage = `<div class="text-left">
      <p class="mb-3"><strong>Venta:</strong> ${sale.sale_number}</p>
      <p class="mb-3"><strong>Total:</strong> ${formatCurrency(sale.total)}</p>
      <p class="mb-3"><strong>Productos:</strong> ${itemsCount} item(s)</p>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
        <p class="font-bold text-yellow-800 mb-2">⚠️ IMPORTANTE:</p>
        <ul class="text-sm text-yellow-700 space-y-1">
          <li>📦 Los productos volverán al inventario</li>`;

    if (sale.points_earned && sale.points_earned > 0) {
      warningMessage += `
          <li>🎯 Se descontarán ${sale.points_earned} puntos del cliente</li>`;
    }

    if (sale.payment_method === 'credito' && sale.amount_pending && sale.amount_pending > 0) {
      warningMessage += `
          <li>💰 La deuda del cliente se reducirá en ${formatCurrency(sale.amount_pending)}</li>`;
    }

    warningMessage += `
        </ul>
      </div>

      <p class="text-red-600 font-semibold">Esta acción no se puede deshacer</p>
    </div>`;

    const result = await SwalOriginal.fire({
      title: "¿Eliminar esta venta?",
      html: warningMessage,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await deleteSale(sale.id, getToken);

      Swal.success(
        "Venta eliminada",
        "La venta ha sido eliminada y el inventario restaurado correctamente"
      );

      // Recargar la lista de ventas
      await fetchSales();
    } catch (error: any) {
      console.error("Error eliminando venta:", error);
      Swal.error(
        "Error al eliminar",
        error.message || "No se pudo eliminar la venta"
      );
    }
  };

  const toggleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSales.size === sales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(sales.map(s => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSales.size === 0) {
      Swal.warning("Sin selección", "No hay ventas seleccionadas para eliminar");
      return;
    }

    const selectedSalesData = sales.filter(s => selectedSales.has(s.id));
    const totalAmount = selectedSalesData.reduce((sum, s) => sum + s.total, 0);
    const totalItems = selectedSalesData.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const totalPoints = selectedSalesData.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const creditSales = selectedSalesData.filter(s => s.payment_method === 'credito');

    let warningMessage = `<div class="text-left">
      <p class="mb-3"><strong>Ventas a eliminar:</strong> ${selectedSales.size}</p>
      <p class="mb-3"><strong>Monto total:</strong> ${formatCurrency(totalAmount)}</p>
      <p class="mb-3"><strong>Productos totales:</strong> ${totalItems} item(s)</p>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
        <p class="font-bold text-yellow-800 mb-2">⚠️ IMPORTANTE:</p>
        <ul class="text-sm text-yellow-700 space-y-1">
          <li>📦 Todos los productos volverán al inventario</li>`;

    if (totalPoints > 0) {
      warningMessage += `
          <li>🎯 Se descontarán ${totalPoints} puntos totales de los clientes</li>`;
    }

    if (creditSales.length > 0) {
      const totalCredit = creditSales.reduce((sum, s) => sum + (s.amount_pending || 0), 0);
      warningMessage += `
          <li>💰 ${creditSales.length} venta(s) a crédito - se reducirá la deuda en ${formatCurrency(totalCredit)}</li>`;
    }

    warningMessage += `
        </ul>
      </div>

      <p class="text-red-600 font-semibold">Esta acción no se puede deshacer</p>
    </div>`;

    const result = await SwalOriginal.fire({
      title: `¿Eliminar ${selectedSales.size} venta(s)?`,
      html: warningMessage,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar todas",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const saleId of selectedSales) {
        try {
          await deleteSale(saleId, getToken);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error eliminando venta ${saleId}:`, error);
        }
      }

      if (errorCount === 0) {
        Swal.success(
          "Ventas eliminadas",
          `Se eliminaron ${successCount} venta(s) correctamente`
        );
      } else {
        Swal.warning(
          "Eliminación parcial",
          `Se eliminaron ${successCount} venta(s). ${errorCount} fallaron.`
        );
      }

      setSelectedSales(new Set());
      await fetchSales();
    } catch (error: any) {
      console.error("Error eliminando ventas:", error);
      Swal.error(
        "Error al eliminar",
        error.message || "No se pudieron eliminar las ventas"
      );
    }
  };

  const handleDeleteAll = async () => {
    if (sales.length === 0) {
      Swal.warning("Sin ventas", "No hay ventas para eliminar");
      return;
    }

    const totalAmount = sales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = sales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const totalPoints = sales.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const creditSales = sales.filter(s => s.payment_method === 'credito');

    let warningMessage = `<div class="text-left">
      <div class="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
        <p class="font-bold text-red-800 mb-2 text-lg">🚨 ACCIÓN IRREVERSIBLE</p>
        <p class="text-red-700">Estás a punto de eliminar TODAS las ventas</p>
      </div>

      <p class="mb-3"><strong>Total de ventas:</strong> ${sales.length}</p>
      <p class="mb-3"><strong>Monto total:</strong> ${formatCurrency(totalAmount)}</p>
      <p class="mb-3"><strong>Productos totales:</strong> ${totalItems} item(s)</p>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
        <p class="font-bold text-yellow-800 mb-2">⚠️ QUÉ SUCEDERÁ:</p>
        <ul class="text-sm text-yellow-700 space-y-2">
          <li>📦 <strong>TODOS</strong> los productos volverán al inventario</li>`;

    if (totalPoints > 0) {
      warningMessage += `
          <li>🎯 Se descontarán <strong>${totalPoints} puntos</strong> totales de los clientes</li>`;
    }

    if (creditSales.length > 0) {
      const totalCredit = creditSales.reduce((sum, s) => sum + (s.amount_pending || 0), 0);
      warningMessage += `
          <li>💰 <strong>${creditSales.length} venta(s) a crédito</strong> - se reducirá la deuda total en ${formatCurrency(totalCredit)}</li>`;
    }

    warningMessage += `
          <li>🗑️ Se eliminarán <strong>TODAS</strong> las ${sales.length} ventas del historial</li>
        </ul>
      </div>

      <p class="text-red-600 font-bold text-lg mt-4">⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️</p>
    </div>`;

    const result = await SwalOriginal.fire({
      title: `¿Eliminar TODAS las ${sales.length} ventas?`,
      html: warningMessage,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar TODAS",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    // Doble confirmación con advertencia más seria
    const confirmAgain = await SwalOriginal.fire({
      title: "🚨 ÚLTIMA CONFIRMACIÓN 🚨",
      html: `<div class="text-center">
        <p class="text-lg font-bold mb-3">¿Estás COMPLETAMENTE seguro?</p>
        <p class="mb-3">Se eliminarán <strong class="text-red-600">${sales.length} ventas</strong></p>
        <p class="mb-3">Por un total de <strong class="text-red-600">${formatCurrency(totalAmount)}</strong></p>
        <p class="text-red-600 font-bold mt-4">NO PODRÁS RECUPERAR ESTA INFORMACIÓN</p>
      </div>`,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "SÍ, ELIMINAR TODO",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirmAgain.isConfirmed) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const sale of sales) {
        try {
          await deleteSale(sale.id, getToken);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error eliminando venta ${sale.id}:`, error);
        }
      }

      if (errorCount === 0) {
        Swal.success(
          "Todas las ventas eliminadas",
          `Se eliminaron ${successCount} venta(s) correctamente`
        );
      } else {
        Swal.warning(
          "Eliminación parcial",
          `Se eliminaron ${successCount} venta(s). ${errorCount} fallaron.`
        );
      }

      setSelectedSales(new Set());
      await fetchSales();
    } catch (error: any) {
      console.error("Error eliminando ventas:", error);
      Swal.error(
        "Error al eliminar",
        error.message || "No se pudieron eliminar las ventas"
      );
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 ">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 ">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ventas</h1>
          <p className="text-gray-500 text-sm md:text-base">
            Historial de todas las ventas
          </p>
        </div>

        {/* Botones de Exportación */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportAll}
            disabled={sales.length === 0}
            className="text-sm"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>

          {/* <Button
            variant="outline"
            onClick={handleExportForPredictions}
            disabled={sales.length === 0}
            className="text-sm"
          >
            <Brain className="mr-2 h-4 w-4" />
            Exportar para Predicciones
          </Button> */}
        </div>
      </div>


      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["all", "today", "week", "month"].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => {
                    setFilter(f);
                    setShowCustomDateRange(false);
                  }}
                  className="text-sm md:text-base flex-1 sm:flex-none"
                >
                  {f === "all"
                    ? "Todas"
                    : f === "today"
                    ? "Hoy"
                    : f === "week"
                    ? "Semana"
                    : "Mes"}
                </Button>
              ))}
              <Button
                variant={showCustomDateRange ? "default" : "outline"}
                onClick={() => setShowCustomDateRange(!showCustomDateRange)}
                className="text-sm md:text-base flex-1 sm:flex-none"
              >
                Rango Personalizado
              </Button>
            </div>

            {/* Selector de rango personalizado */}
            {showCustomDateRange && (
              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="start-date" className="text-sm">
                      Fecha Inicio
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm">
                      Fecha Fin
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end gap-2">
                    <Button
                      onClick={handleExportCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Rango
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  💡 Tip: Usa el rango personalizado para exportar ventas
                  específicas para análisis de predicciones
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-gray-500">Total Ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-xs text-gray-500">Monto Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-xl md:text-2xl font-bold">
              {sales.length > 0
                ? formatCurrency(totalSales / sales.length)
                : "$0"}
            </div>
            <p className="text-xs text-gray-500">Promedio por Venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de ventas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Cargando ventas...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">No hay ventas en este período</p>
            </div>
          ) : (
            <>
              {/* Botones de eliminación masiva - Sticky */}
              {selectedSales.size > 0 && (
                <div className="sticky top-0 z-10 bg-brand-light/50 border border-brand/40 rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="text-sm font-medium text-brand">
                    {selectedSales.size} venta(s) seleccionada(s)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSales(new Set())}
                    >
                      Cancelar selección
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar seleccionadas
                    </Button>
                  </div>
                </div>
              )}

              {/* Botón para eliminar todas */}
              {/* {sales.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar todas las ventas ({sales.length})
                  </Button>
                </div>
              )} */}

              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedSales.size === sales.length && sales.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 cursor-pointer"
                          title="Seleccionar todas"
                        />
                      </th>
                      <th className="text-left py-3 px-4">Número</th>
                      <th className="text-left py-3 px-4">Fecha</th>
                      <th className="text-left py-3 px-4">Cliente</th>
                      <th className="text-left py-3 px-4">Cajero</th>
                      <th className="text-left py-3 px-4">Método de Pago</th>
                      <th className="text-right py-3 px-4">Items</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-center py-3 px-4">Estado</th>
                      <th className="text-center py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale.id)}
                            onChange={() => toggleSelectSale(sale.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">
                          {sale.sale_number}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {format(
                            (sale.created_at as any)?.toDate
                              ? (sale.created_at as any).toDate()
                              : new Date(sale.created_at),
                            "dd MMM yyyy HH:mm",
                            { locale: es }
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {sale.customer ? (
                            <div>
                              <p className="font-medium text-sm">
                                {sale.customer.name}
                              </p>
                              {sale.customer.phone && (
                                <p className="text-xs text-gray-500">
                                  {sale.customer.phone}
                                </p>
                              )}
                            </div>
                          ) : sale.sale_number.startsWith("WEB-") ? (
                            (() => {
                              const webCustomer = extractCustomerInfoFromNotes(
                                sale.notes || ""
                              );
                              return webCustomer ? (
                                <div>
                                  <p className="font-medium text-sm">
                                    {webCustomer.name}
                                  </p>
                                  {webCustomer.phone && (
                                    <p className="text-xs text-gray-500">
                                      {webCustomer.phone}
                                    </p>
                                  )}
                                  <span className="text-xs bg-brand-light text-brand px-1 rounded">
                                    Web
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Sin cliente
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Sin cliente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {sale.cashier?.full_name || "N/A"}
                        </td>
                        <td className="py-3 px-4 capitalize">
                          {sale.payment_method}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sale.items?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {sale.payment_method === "credito" ? (
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs ${
                                sale.payment_status === "pagado"
                                  ? "bg-green-100 text-green-800"
                                  : sale.payment_status === "parcial"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {sale.payment_status}
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs ${
                                sale.status === "completada"
                                  ? "bg-green-100 text-green-800"
                                  : sale.status === "cancelada"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {sale.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowDetailModal(true);
                              }}
                              title="Ver productos"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowInvoice(sale)}
                              title="Ver factura"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSale(sale)}
                              title="Eliminar venta"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de cards para móvil y tablet */}
              <div className="lg:hidden space-y-3">
                {sales.map((sale) => (
                  <Card key={sale.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale.id)}
                            onChange={() => toggleSelectSale(sale.id)}
                            className="w-4 h-4 cursor-pointer mt-1"
                          />
                          <div>
                            <p className="font-mono text-sm font-semibold">
                              {sale.sale_number}
                            </p>
                          <p className="text-xs text-gray-500">
                            {format(
                              (sale.created_at as any)?.toDate
                                ? (sale.created_at as any).toDate()
                                : new Date(sale.created_at),
                              "dd MMM yyyy HH:mm",
                              { locale: es }
                            )}
                          </p>
                          </div>
                        </div>
                        {sale.payment_method === "credito" ? (
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              sale.payment_status === "pagado"
                                ? "bg-green-100 text-green-800"
                                : sale.payment_status === "parcial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {sale.payment_status}
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              sale.status === "completada"
                                ? "bg-green-100 text-green-800"
                                : sale.status === "cancelada"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {sale.status}
                          </span>
                        )}
                      </div>

                      {/* Cliente */}
                      {(() => {
                        const customer = sale.customer;
                        const webCustomer = sale.sale_number.startsWith("WEB-")
                          ? extractCustomerInfoFromNotes(sale.notes || "")
                          : null;

                        if (customer || webCustomer) {
                          return (
                            <div className="mb-3 bg-brand-light/50 border border-brand/30 rounded p-2">
                              <div className="flex justify-between items-start">
                                <span className="text-xs text-gray-500">
                                  Cliente:
                                </span>
                                {sale.sale_number.startsWith("WEB-") && (
                                  <span className="text-xs bg-brand text-white px-2 py-0.5 rounded">
                                    Web
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-sm">
                                {customer?.name || webCustomer?.name}
                              </p>
                              {(customer?.phone || webCustomer?.phone) && (
                                <p className="text-xs text-gray-500">
                                  {customer?.phone || webCustomer?.phone}
                                </p>
                              )}
                              {webCustomer?.email && (
                                <p className="text-xs text-gray-500">
                                  {webCustomer.email}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Cajero:</span>
                          <p className="truncate">
                            {sale.cashier?.full_name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pago:</span>
                          <p className="capitalize">{sale.payment_method}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <p>{sale.items?.length || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Productos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowInvoice(sale)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver Factura
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSale(sale)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Factura */}
      {userProfile && invoiceSale && (
        <InvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          sale={invoiceSale}
          saleItems={invoiceSaleItems}
          customer={invoiceCustomer}
          storeInfo={userProfile}
          cashierName={user?.fullName || undefined}
        />
      )}

      {/* Modal de detalle de venta */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto ">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Detalle de Venta</h2>
                <p className="text-sm text-gray-500">
                  {selectedSale.sale_number}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSale(null);
                }}
              >
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2 text-sm text-gray-600">
                      Fecha
                    </h3>
                    <p className="text-sm">
                      {format(
                        (selectedSale.created_at as any)?.toDate
                          ? (selectedSale.created_at as any).toDate()
                          : new Date(selectedSale.created_at),
                        "dd 'de' MMMM 'de' yyyy, HH:mm",
                        { locale: es }
                      )}
                    </p>
                  </CardContent>
                </Card>

                {(() => {
                  const customer = selectedSale.customer;
                  const webCustomer = selectedSale.sale_number.startsWith(
                    "WEB-"
                  )
                    ? extractCustomerInfoFromNotes(selectedSale.notes || "")
                    : null;

                  if (customer || webCustomer) {
                    return (
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-sm text-gray-600">
                              Cliente
                            </h3>
                            {selectedSale.sale_number.startsWith("WEB-") && (
                              <span className="text-xs bg-brand text-white px-2 py-0.5 rounded">
                                Venta Web
                              </span>
                            )}
                          </div>
                          <p className="font-medium">
                            {customer?.name || webCustomer?.name}
                          </p>
                          {(customer?.phone || webCustomer?.phone) && (
                            <p className="text-sm text-gray-500">
                              {customer?.phone || webCustomer?.phone}
                            </p>
                          )}
                          {(customer?.email || webCustomer?.email) && (
                            <p className="text-sm text-gray-500">
                              {customer?.email || webCustomer?.email}
                            </p>
                          )}
                          {customer && (
                            <p className="text-xs text-brand mt-1">
                              {customer.loyalty_points} puntos de lealtad
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2 text-sm text-gray-600">
                      Cajero
                    </h3>
                    <p className="text-sm">
                      {selectedSale.cashier?.full_name || "N/A"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2 text-sm text-gray-600">
                      Método de Pago
                    </h3>
                    <p className="text-sm capitalize">
                      {selectedSale.payment_method}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Productos comprados */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">
                  Productos Comprados
                </h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">
                          Producto
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold whitespace-nowrap">
                          Cantidad
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold whitespace-nowrap">
                          Precio Unit.
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold whitespace-nowrap">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item: any) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-3 px-4">
                              <p className="font-medium text-sm">
                                {item.product?.name || "Producto no disponible"}
                              </p>
                              {item.product?.barcode && (
                                <p className="text-xs text-gray-500">
                                  Código: {item.product.barcode}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 text-center text-gray-500 text-sm"
                          >
                            No hay productos en esta venta
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  {selectedSale.points_earned &&
                    selectedSale.points_earned > 0 && (
                      <div className="flex justify-between text-sm text-brand">
                        <span>Puntos ganados:</span>
                        <span className="font-semibold">
                          +{selectedSale.points_earned} puntos
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-green-600">
                      {formatCurrency(selectedSale.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
