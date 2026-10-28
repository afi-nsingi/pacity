import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const { jeton } = await searchParams;
  return (
    <div className="max-w-md">
      <h1 className="page-title">Choisissez un nouveau mot de passe</h1>
      {jeton ? (
        <>
          <p className="page-lead mb-6">Encore une étape : votre nouveau mot de passe, et vous voilà connecté·e.</p>
          <ResetForm token={jeton} />
        </>
      ) : (
        <p className="page-lead">
          Ce lien est incomplet. <Link href="/mot-de-passe-oublie" className="font-semibold text-accent underline">Demandez un nouveau lien</Link>.
        </p>
      )}
    </div>
  );
}
