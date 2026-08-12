"use client";

import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ||
  "https://tienda-pos-api.julii1295.workers.dev";

interface Review {
  rating: number;
  comment: string;
  storeName: string;
  storeCity: string;
  date: string;
}

interface ReviewsData {
  average: number;
  count: number;
  reviews: Review[];
}

/** Dibuja una fila de estrellas para una calificación dada. */
function Stars({ rating, size = 5 }: { rating: number; size?: number }) {
  const cls = size === 5 ? "h-5 w-5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${
            s <= Math.round(rating)
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-500"
          }`}
        />
      ))}
    </div>
  );
}

export default function PosReviews() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/stats/reviews`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setData({
          average: json.average || 0,
          count: json.count || 0,
          reviews: Array.isArray(json.reviews) ? json.reviews : [],
        });
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // No mostramos la sección hasta que haya al menos una reseña.
  if (!loaded || !data || data.count === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Lo que dicen las tiendas
          </h2>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-yellow-400">
                {data.average.toFixed(1)}
              </span>
              <Stars rating={data.average} size={6} />
            </div>
            <p className="text-white/70">
              Basado en {data.count}{" "}
              {data.count === 1 ? "reseña" : "reseñas"} de tiendas reales
            </p>
          </div>
        </div>

        {data.reviews.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {data.reviews.map((review, i) => (
              <div
                key={i}
                className="relative rounded-2xl border border-gray-700 bg-gray-800/60 p-6 shadow-lg"
              >
                <Quote className="absolute right-4 top-4 h-8 w-8 text-gray-700" />
                <Stars rating={review.rating} />
                <p className="mt-3 text-gray-200 leading-relaxed">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div className="mt-4 border-t border-gray-700 pt-3">
                  <p className="font-semibold text-white">{review.storeName}</p>
                  {review.storeCity && (
                    <p className="text-sm text-gray-400">{review.storeCity}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
