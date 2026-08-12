"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getMyPosReview,
  saveMyPosReview,
} from "@/lib/cloudflare-api";

/**
 * Tarjeta para que el tendero califique el sistema POS con estrellas y deje un
 * comentario. Se muestra en la página de Configuración. La reseña se acumula
 * con las demás para mostrar un promedio global en la landing.
 */
export default function PosReviewCard() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMyPosReview(getToken)
      .then((review) => {
        if (cancelled || !review) return;
        setRating(review.rating);
        setComment(review.comment);
        setAlreadyReviewed(true);
      })
      .catch((err) => {
        // Un 404 / sin reseña no es un error real.
        console.error("Error cargando reseña:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Selecciona al menos una estrella");
      return;
    }

    setSaving(true);
    try {
      await saveMyPosReview({ rating, comment: comment.trim() }, getToken);
      setAlreadyReviewed(true);
      toast.success(
        alreadyReviewed
          ? "¡Reseña actualizada! Se revisará antes de publicarse."
          : "¡Gracias por tu reseña! La revisaremos antes de publicarla.",
      );
    } catch (error) {
      console.error("Error guardando reseña:", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la reseña",
      );
    } finally {
      setSaving(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <Card className="border-yellow-300/60 bg-yellow-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Califica el sistema POS
        </CardTitle>
        <p className="text-sm text-gray-600">
          Cuéntanos tu experiencia con posib.dev. Tu calificación ayuda a otras
          tiendas a conocer el sistema. Las reseñas se revisan antes de aparecer
          en nuestra página principal.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estrellas */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= displayRating
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {rating} de 5
                </span>
              )}
            </div>

            {/* Comentario */}
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe tu comentario sobre el sistema (opcional)..."
              rows={3}
              maxLength={500}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {comment.length}/500
              </span>
              <Button
                onClick={handleSubmit}
                disabled={saving || rating < 1}
                className="bg-brand hover:bg-brand-hover text-white"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {alreadyReviewed ? "Actualizar reseña" : "Enviar reseña"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
