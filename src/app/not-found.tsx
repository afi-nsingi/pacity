import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <Image src="/pacity-logo.svg" alt="Pacity" width={120} height={32} className="mx-auto" />
        <p className="mt-10 text-6xl font-bold text-accent">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-muted">La page que vous cherchez n’existe pas ou n’est pas accessible avec votre compte.</p>
        <Link href="/" className="btn-primary mt-6">Retour à l’accueil</Link>
      </div>
    </main>
  );
}
