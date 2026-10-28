import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata = { title: "Accès refusé" };

export default function AccessDeniedPage() {
  return (
    <div className="py-10 text-center">
      <ShieldX className="mx-auto h-14 w-14 text-muted" strokeWidth={1.5} />
      <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
      <p className="mt-2 text-muted">Vous n’avez pas accès à cette page avec votre compte.</p>
      <Link href="/" className="btn-primary mt-6">Retour à l’accueil</Link>
    </div>
  );
}
