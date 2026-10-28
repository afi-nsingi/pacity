export const metadata = { title: "Règlement intérieur" };

const RULES = [
  ["Réservez avant d’entrer.", "Une salle s’utilise uniquement sur un créneau confirmé dans l’application. Pas de réservation ? Vérifiez les créneaux libres, c’est rapide."],
  ["Respectez votre créneau.", "Arrivez à l’heure et libérez la salle à la fin : le membre suivant compte dessus."],
  ["Un empêchement ?", "Prévenez l’équipe Pacity au plus tôt pour libérer le créneau. En cas d’annulation, vos crédits vous sont rendus."],
  ["Vos crédits, à votre rythme.", "Les 20 crédits mensuels de l’abonnement Full Time se cumulent d’un mois sur l’autre : ceux que vous n’utilisez pas restent sur votre compte."],
  ["Laissez la salle comme vous l’avez trouvée.", "Chaises remises en place, tableau effacé, déchets jetés, fenêtres fermées."],
  ["Prenez soin du matériel.", "Écran, câbles et télécommandes restent dans la salle. Un souci ? Signalez-le à l’équipe."],
  ["Boissons oui, repas non.", "Pour garder les salles agréables, les repas se prennent dans les espaces dédiés."],
  ["Pensez aux voisins.", "Modérez le volume, surtout pendant vos appels."],
  ["La bienveillance avant tout.", "Une question, un doute sur un créneau ? L’équipe Pacity est là pour vous aider."],
];

export default function RulesPage() {
  return (
    <div className="leading-relaxed">
      <h1 className="page-title">Règlement intérieur des salles</h1>
      <p className="mt-3 text-muted">Quelques règles simples pour que chaque membre trouve une salle propre, prête et disponible à l’heure.</p>
      <p className="mt-6 text-sm text-muted">Proposition rédigée pour le prototype : à adapter et valider par Pacity.</p>
      <ol className="mt-8 space-y-5">
        {RULES.map(([title, text], i) => (
          <li key={title} className="card flex gap-4 p-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent-dark">{i + 1}</span>
            <p><strong>{title}</strong> {text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-10 font-medium">À très vite chez Pacity ☕</p>
    </div>
  );
}
