import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  if (await getSession()) redirect("/");
  const { suite } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Image src="/pacity-logo.svg" alt="Pacity" width={150} height={40} priority />
          <h1 className="mt-10 text-3xl font-bold tracking-tight">Bon retour chez Pacity 👋</h1>
          <p className="mt-2 text-muted">Connectez-vous pour réserver votre salle en quelques clics.</p>
          <div className="mt-8">
            <LoginForm next={suite ?? "/"} />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-muted">
            En vous connectant, vous acceptez le{" "}
            <Link href="/reglement" className="underline hover:text-accent">règlement intérieur</Link> et notre{" "}
            <Link href="/confidentialite" className="underline hover:text-accent">politique de confidentialité</Link>.
          </p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-accent to-mustard lg:block">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cream/20" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sage/30" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="text-4xl font-bold leading-tight">Vos salles de réunion,<br />réservées en quelques clics.</p>
          <p className="mt-4 max-w-md text-white/85">Appels, réunions, ateliers : choisissez votre salle, vos crédits sont débités et votre créneau confirmé instantanément.</p>
        </div>
      </section>
    </main>
  );
}
