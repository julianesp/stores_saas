"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Check, X, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  getAllPosReviews,
  moderatePosReview,
  deletePosReviewAsAdmin,
  type AdminPosReview,
} from "@/lib/cloudflare-api";

/** Estrellas de solo lectura. */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Panel del superadmin para moderar las reseñas del sistema POS.
 * Las reseñas nuevas llegan como "pendientes" y no aparecen en la landing hasta
 * ser aprobadas aquí.
 */
export default function PosReviewsModerator() {
  const { getToken } = useAuth();
  const [reviews, setReviews] = useState<AdminPosReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const data = await getAllPosReviews(getToken);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar reseñas",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModerate = async (review: AdminPosReview, approve: boolean) => {
    setBusyId(review.userProfileId);
    try {
      await moderatePosReview(review.userProfileId, approve, getToken);
      setReviews((prev) =>
        prev.map((r) =>
          r.userProfileId === review.userProfileId
            ? { ...r, isApproved: approve }
            : r,
        ),
      );
      toast.success(approve ? "Reseña aprobada" : "Reseña ocultada");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (review: AdminPosReview) => {
    if (!window.confirm(`¿Eliminar la reseña de "${review.storeName}"?`)) return;
    setBusyId(review.userProfileId);
    try {
      await deletePosReviewAsAdmin(review.userProfileId, getToken);
      setReviews((prev) =>
        prev.filter((r) => r.userProfileId !== review.userProfileId),
      );
      toast.success("Reseña eliminada");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar",
      );
    } finally {
      setBusyId(null);
    }
  };

  const pending = reviews.filter((r) => !r.isApproved).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand" />
          Reseñas del sistema POS
          {pending > 0 && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {pending} pendiente{pending > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-gray-500">
          Aprueba las reseñas para que aparezcan en la landing. Las pendientes no
          se muestran públicamente.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando reseñas...
          </div>
        ) : reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Aún no hay reseñas.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.userProfileId}
                className={`rounded-lg border p-4 ${
                  review.isApproved
                    ? "border-gray-200 bg-white"
                    : "border-yellow-300 bg-yellow-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{review.storeName}</p>
                      {review.storeCity && (
                        <span className="text-xs text-gray-400">
                          {review.storeCity}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          review.isApproved
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {review.isApproved ? "Aprobada" : "Pendiente"}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-gray-700">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {review.isApproved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === review.userProfileId}
                        onClick={() => handleModerate(review, false)}
                        title="Ocultar de la landing"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busyId === review.userProfileId}
                        onClick={() => handleModerate(review, true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        title="Aprobar y mostrar en la landing"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === review.userProfileId}
                      onClick={() => handleDelete(review)}
                      className="text-red-500 hover:text-red-600"
                      title="Eliminar reseña"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
