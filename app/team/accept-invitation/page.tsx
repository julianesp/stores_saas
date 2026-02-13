"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AcceptInvitationContent from "./AcceptInvitationContent";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando invitación...</p>
      </div>
    </div>
  );
}
