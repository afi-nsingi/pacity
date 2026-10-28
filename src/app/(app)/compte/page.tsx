import { requireSession } from "@/lib/session";
import { PLAN_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const { profile, email } = await requireSession();
  const rows = [
    ["Nom complet", profile.full_name],
    ["Adresse e-mail", email],
    profile.role === "manager" ? ["Rôle", "Gérant"] : ["Abonnement", profile.plan ? PLAN_LABEL[profile.plan] : "—"],
  ];
  return (
    <>
      <PageHeader title="Mon compte" lead="Vos informations chez Pacity. Votre nom et votre abonnement sont gérés par l’équipe Pacity ; votre mot de passe, par vous." />
      <div className="card max-w-xl p-6">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-accent text-2xl font-bold text-white">
          {profile.full_name.charAt(0)}
        </div>
        <dl className="space-y-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-6"><PasswordForm /></div>
    </>
  );
}
