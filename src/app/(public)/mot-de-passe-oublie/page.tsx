import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-md">
      <h1 className="page-title">Mot de passe oublié ?</h1>
      <p className="page-lead mb-6">Saisissez l’adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
      <ForgotForm />
    </div>
  );
}
