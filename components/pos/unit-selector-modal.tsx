"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Package, Layers } from "lucide-react";

interface UnitSelectorModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, isUnitSale: boolean) => void;
}

export function UnitSelectorModal({
  product,
  isOpen,
  onClose,
  onConfirm,
}: UnitSelectorModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [saleType, setSaleType] = useState<"package" | "unit">("package");
  const [inputValue, setInputValue] = useState("1");

  const unitsPerPackage = product.units_per_package || 1;
  const pricePerUnit =
    product.price_per_unit || product.sale_price / unitsPerPackage;
  const packageName = product.package_name || "paquete";
  const unitName = product.unit_name || "unidad";

  const calculateTotal = () => {
    if (saleType === "package") {
      return product.sale_price * quantity;
    } else {
      return pricePerUnit * quantity;
    }
  };

  const handleConfirm = () => {
    onConfirm(quantity, saleType === "unit");
    setQuantity(1);
    setInputValue("1");
    setSaleType("package");
  };

  const handleCancel = () => {
    setQuantity(1);
    setInputValue("1");
    setSaleType("package");
    onClose();
  };

  // Calcular stock disponible según tipo de venta
  const availableStock =
    saleType === "package" ? product.stock : product.stock * unitsPerPackage;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo deseas vender {product.name}?</DialogTitle>
          <DialogDescription>
            Puedes vender {packageName}s completos o {unitName}es sueltos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de tipo de venta */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={saleType === "package" ? "default" : "outline"}
              className="h-auto flex flex-col items-center gap-2 p-4 text-black"
              onClick={() => setSaleType("package")}
            >
              <Package className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">{packageName}</div>
                <div className="text-xs opacity-80">
                  {formatCurrency(product.sale_price)}
                </div>
                <div className="text-xs opacity-60">
                  ({unitsPerPackage} {unitName}es)
                </div>
              </div>
            </Button>

            <Button
              type="button"
              variant={saleType === "unit" ? "default" : "outline"}
              className="h-auto flex flex-col items-center gap-2 p-4 text-black"
              onClick={() => setSaleType("unit")}
            >
              <Layers className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">{unitName} suelto</div>
                <div className="text-xs opacity-80">
                  {formatCurrency(pricePerUnit)}
                </div>
                <div className="text-xs opacity-60">por {unitName}</div>
              </div>
            </Button>
          </div>

          {/* Input de cantidad */}
          <div className="space-y-2 text-black">
            <Label htmlFor="quantity">
              Cantidad de{" "}
              {saleType === "package" ? packageName + "s" : unitName + "es"}
            </Label>
            <div className="flex items-center gap-2 cursor-pointer">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newQty = Math.max(1, quantity - 1);
                  setQuantity(newQty);
                  setInputValue(newQty.toString());
                }}
                disabled={quantity <= 1}
                className="text-[25px]"
              >
                -
              </Button>
              <Input
                id="quantity"
                type="text"
                inputMode="numeric"
                placeholder="1"
                value={inputValue}
                onFocus={(e) => {
                  // Limpiar el input al enfocar
                  setInputValue("");
                  e.target.select();
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  // Solo permitir números
                  if (value === "" || /^\d+$/.test(value)) {
                    setInputValue(value);
                    const val = parseInt(value);
                    if (!isNaN(val) && val >= 1) {
                      setQuantity(Math.min(availableStock, val));
                    }
                  }
                }}
                onBlur={(e) => {
                  // Si el campo está vacío al perder el foco, establecer 1
                  if (!e.target.value || parseInt(e.target.value) < 1) {
                    setQuantity(1);
                    setInputValue("1");
                  } else {
                    setInputValue(quantity.toString());
                  }
                }}
                className="text-center text-lg font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newQty = Math.min(availableStock, quantity + 1);
                  setQuantity(newQty);
                  setInputValue(newQty.toString());
                }}
                disabled={quantity >= availableStock}
                className="cursor-pointer text-[25px]"
              >
                +
              </Button>
            </div>
            <p className="text-xs text-black">
              Disponible: {availableStock}{" "}
              {saleType === "package" ? packageName + "s" : unitName + "es"}
            </p>
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {quantity} {saleType === "package" ? packageName : unitName}
              {quantity > 1 ? "es" : ""} ×{" "}
              {formatCurrency(
                saleType === "package" ? product.sale_price : pricePerUnit,
              )}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 text-black">
          <Button
            type="button"
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button type="button" className="flex-1 cursor-pointer" onClick={handleConfirm}>
            Agregar al carrito
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
