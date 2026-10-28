# Pacity · réservation de salles de réunion

Application de réservation de salles pour **Pacity**, un espace de coworking. Elle remplace un
fonctionnement par Google Calendar et Slack, source de conflits, d'erreurs et d'oublis de
facturation.

Cas pratique NoCode Factory, réalisé avec **Claude Code** par Afi NSINGI NDOMBELE (octobre 2026).

**Démo en ligne : https://pacity-reservations.vercel.app** (comptes de démonstration transmis à part).

## Ce que fait l'application

**Membres**
- voir les salles (photo, capacité, coût en crédits par heure) et les créneaux déjà pris ;
- réserver une salle en un clic : la réservation est **confirmée immédiatement** et les crédits sont débités ;
- suivre ses réservations, son solde et l'historique de ses crédits ;
- recevoir un e-mail de confirmation, et un e-mail avec le motif si le gérant annule.
- changer son mot de passe depuis « Mon compte » (le mot de passe actuel est vérifié).
- réinitialiser seul un mot de passe oublié (lien à usage unique par e-mail, valable une heure).

**Gérant**
- voir toutes les réservations (recherche, filtres membre, salle, période, statut) ;
- annuler n'importe quelle réservation avec un motif : le membre est remboursé ;
- suivre les abonnements, les soldes et chaque mouvement de crédits.
- rendre une salle indisponible (travaux, fuite, privatisation…) avec un motif affiché aux membres, puis la rouvrir.

## Règles métier

| Règle | Où elle est garantie |
|---|---|
| Deux réservations confirmées d'une même salle ne se chevauchent jamais | contrainte d'exclusion PostgreSQL (`no_overlap`) |
| Abonnement Nomad : aucune réservation | fonction `book_room` |
| Solde suffisant, débit dans la même transaction que la réservation | fonction `book_room` |
| Salle rendue indisponible par le gérant : plus aucune réservation possible | fonction `book_room` + RLS (seul le gérant modifie une salle) |
| Créneaux à l'heure pile, 08:00 → 20:00, du lundi au vendredi, pas dans le passé, jusqu'à 30 jours | fonction `book_room` (et le formulaire) |
| Annulation par le gérant seulement, motif obligatoire, un seul remboursement | fonction `cancel_booking` + index unique |
| Full Time : +20 crédits le 1er de chaque mois, cumulables, jamais en double | `grant_monthly_credits` planifiée par `pg_cron` + index unique |
| Un membre ne voit que ses données ; personne n'écrit directement dans les crédits | Row Level Security |

Les règles vivent **dans la base** : quelle que soit la page ou l'outil utilisé, elles s'appliquent.
Le solde n'est jamais un champ modifié à la main : c'est la somme d'un registre de mouvements.

## Technologies

- **Next.js 15** (App Router, Server Actions, TypeScript) et **Tailwind CSS 4** ;
- **Supabase** : PostgreSQL, authentification par e-mail et mot de passe, `pg_cron` ;
- **Vercel** pour l'hébergement ;
- e-mails envoyés par le serveur SMTP de Gmail, sans dépendance (`src/lib/mail.ts`).

## Structure

```
supabase/migrations/   schéma, règles métier, droits (SQL)
supabase/seed.sql      les 4 salles
scripts/               comptes de démonstration et recette automatique des règles
src/app/(app)/         pages connectées (membre et gérant)
src/app/(public)/      confidentialité, règlement, accès refusé
src/lib/               dates (heure de Paris), session, e-mails
```

## Lancer le projet en local

1. Créer un projet Supabase et exécuter, dans l'ordre, `supabase/migrations/0001_schema.sql`,
   `0002_rules.sql` puis `supabase/seed.sql`.
2. Copier `.env.example` en `.env.local` et le compléter (aucune clé n'est dans le dépôt).
3. Installer et lancer :
   ```bash
   npm install
   node --env-file=.env.local scripts/seed-users.mjs   # comptes de démonstration
   npm run dev
   ```
4. Recette automatique des règles, contre la vraie base (elle efface ce qu'elle crée) :
   ```bash
   node --env-file=.env.local scripts/test-rules.mjs
   ```

## Construit avec Claude Code

Le code, le schéma SQL, les tests et ce README ont été écrits avec Claude Code, en dialogue :
choix de la stack, migration depuis une première version no-code (Softr, Airtable, Make),
recette écran par écran. `CLAUDE.md` garde la mémoire du projet : décisions, pièges rencontrés,
vérifications faites.
