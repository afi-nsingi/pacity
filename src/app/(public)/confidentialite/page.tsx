export const metadata = { title: "Confidentialité" };

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-bold">{children}</h2>;

export default function PrivacyPage() {
  return (
    <div className="leading-relaxed">
      <h1 className="page-title">Vos données, en toute transparence 🔒</h1>
      <p className="mt-3 text-muted">
        Chez Pacity, vos données servent à une seule chose : vous permettre de réserver nos salles simplement.
        Voici ce que l’application utilise et pourquoi.
      </p>
      <p className="mt-6 rounded-2xl bg-mustard-soft px-5 py-4 text-sm text-[#7a5408]">
        ⚠️ Version de démonstration (MVP). Cette page décrit le fonctionnement du prototype. Elle doit être relue et validée
        par Pacity avant toute mise en service ; elle ne constitue pas une attestation de conformité.
      </p>

      <H2>1. Les données utilisées</H2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li><strong>Nom</strong> : vous accueillir et identifier vos réservations.</li>
        <li><strong>Adresse e-mail et mot de passe</strong> : vous connecter (le mot de passe est chiffré, personne ne peut le lire).</li>
        <li><strong>Abonnement</strong> (Full Time ou Nomad) : vérifier si vous pouvez réserver.</li>
        <li><strong>Rôle</strong> (membre ou gérant) : afficher les bons écrans et les bons droits.</li>
        <li><strong>Solde et historique de crédits</strong> : garder la trace de chaque débit, remboursement et renouvellement.</li>
        <li><strong>Réservations</strong> (salle, date, créneau, statut, motif d’annulation) : gérer les salles et éviter les doubles réservations.</li>
      </ul>
      <p className="mt-3">L’application ne demande aucune donnée bancaire et ne propose aucun paiement en ligne.</p>

      <H2>2. Qui voit quoi</H2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li><strong>Vous (membre)</strong> : uniquement vos réservations, votre solde et votre historique. Les autres membres ne voient jamais votre nom : les créneaux occupés s’affichent sans identité.</li>
        <li><strong>Le gérant de Pacity</strong> : toutes les réservations, pour les suivre et les annuler si besoin.</li>
        <li><strong>L’équipe technique</strong> qui administre la base, pour la maintenance.</li>
      </ul>

      <H2>3. Les outils utilisés</H2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li><strong>Supabase</strong> : base de données et connexion (comptes, salles, réservations, crédits).</li>
        <li><strong>Vercel</strong> : hébergement de l’application.</li>
      </ul>
      <p className="mt-3">Localisation des données et garanties contractuelles : <strong>à confirmer par Pacity</strong> selon les offres souscrites.</p>

      <H2>4. Durée de conservation</H2>
      <p className="mt-3"><strong>À confirmer par Pacity</strong>, par exemple pendant l’abonnement, puis pour une période limitée après son arrêt.</p>

      <H2>5. Vos droits</H2>
      <p className="mt-3">
        Vous pouvez demander à accéder à vos données, à les faire corriger ou supprimer, à limiter ou contester leur utilisation
        et à les récupérer. En savoir plus sur le site de la{" "}
        <a className="text-accent underline" href="https://www.cnil.fr/fr/mes-demarches/les-droits-pour-maitriser-vos-donnees-personnelles" target="_blank" rel="noreferrer">CNIL</a>,
        où vous pouvez aussi <a className="text-accent underline" href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">adresser une réclamation</a>.
      </p>

      <H2>6. Cookies</H2>
      <p className="mt-3">
        L’application utilise uniquement les cookies nécessaires à votre connexion. Aucun cookie de mesure d’audience ni de publicité :
        aucun bandeau de consentement n’est donc affiché.
      </p>
      <p className="mt-10 font-medium">À très vite chez Pacity ☕</p>
    </div>
  );
}
