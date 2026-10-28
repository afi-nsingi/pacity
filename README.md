# Pacity · réservation de salles de réunion

Application de réservation de salles pour **Pacity**, un espace de coworking. Elle remplace un
fonctionnement par Google Calendar et Slack, source de conflits, d'erreurs et d'oublis de
facturation.

Cas pratique NoCode Factory, réalisé avec **Claude Code** par Afi NSINGI NDOMBELE (octobre 2026).

**Démo en ligne : https://pacity-reservations.vercel.app** (comptes de démonstration transmis à part).

## Ce que fait l'application (le périmètre du brief)

**Membre**
- consulter les salles disponibles et en réserver une : la réservation est **confirmée immédiatement** et les crédits sont débités ;
- consulter les caractéristiques de chaque salle (photo, capacité, usage, coût par heure) ;
- suivre son solde de crédits et l'historique de ses mouvements ;
- accéder à ses propres réservations.

**Gérant**
- consulter les réservations de tous les membres ;
- annuler n'importe quelle réservation, avec un motif : le membre est remboursé.

**Options V1 du brief déjà livrées**
- réserver une salle pour plus d'une heure (de 1 à 4 heures) ;
- rendre une salle temporairement indisponible (travaux, fuite, privatisation…).

## Règles métier

| Règle | Où elle est garantie |
|---|---|
| Coût par heure : Phone Booth 1, Small Room 2, Medium Room 3, Large Room 5 crédits | table `rooms`, calcul dans `book_room` |
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

**Hypothèses retenues** là où le brief restait ouvert (à valider avec Pacity) : horaires d'ouverture
08:00–20:00 en semaine, réservations de 1 à 4 heures, horizon de 30 jours, refus si le solde est
insuffisant, crédits rendus intégralement en cas d'annulation, annulation par l'équipe Pacity
(le membre la prévient).

## Organisation du projet

| Étape | Date | Résultat |
|---|---|---|
| Première version no-code (Softr, Airtable, Make) | 22 → 25/10 | Cadrage, hypothèses, règles de gestion, design, recette |
| Retour de NoCode Factory : refaire le cas en Claude Code | 28/10 | Même sujet, même cadrage, nouvelle réalisation en code |
| Choix technique et base de données | 28/10 | Next.js + Supabase + Vercel ; règles métier écrites en SQL |
| Écrans membre et gérant | 28/10 | Reprise du design de la première version |
| Tests automatiques | 28/10 | Recette des règles contre la vraie base |
| Mise en ligne | 28/10 | GitHub, puis Vercel à chaque envoi du code |
| Recette par écran et par format | 28/10 | Membre, gérant, mobile, tablette, ordinateur |
| Recentrage sur le périmètre du brief | 28/10 | Ajouts hors brief déplacés sur la branche `evolutions` |
| Vidéo de démonstration et envoi | 29 → 30/10 | Lien testable, code, vidéo |

## Priorisation (méthode MoSCoW)

| Priorité | Contenu | Statut |
|---|---|---|
| **Indispensable** (Must) | Les fonctionnalités membre et gérant du brief, les règles de gestion | Livré |
| **Important** (Should) | Options V1 du brief : plus d'une heure, salle indisponible | Livré |
| **Optionnel** (Could) | E-mails, mot de passe oublié, gestion des membres et des abonnements | Prototypé sur la branche `evolutions`, hors application en ligne |
| **Pas maintenant** (Won't) | Achat de crédits (paiement en ligne), options payantes (tarifs à fixer avec Pacity) | Proposé pour la suite |

## Évolutions prêtes à livrer (branche `evolutions`)

Prototypées et testées, mais volontairement **retirées de l'application en ligne** pour rester dans
le périmètre du brief :
- e-mails de confirmation et d'annulation ;
- mot de passe oublié en autonomie et changement de mot de passe ;
- ajout de membres, changement d'abonnement, résiliation et réactivation, avec un historique daté.

La base de démonstration contient encore les tables et fonctions de ces évolutions
(migrations `0003` et `0004` de la branche `evolutions`), sans aucun écran pour les utiliser.

## Technologies

- **Next.js 15** (App Router, Server Actions, TypeScript) et **Tailwind CSS 4** ;
- **Supabase** : PostgreSQL, authentification par e-mail et mot de passe, `pg_cron` ;
- **Vercel** pour l'hébergement.

## Structure

```
supabase/migrations/   schéma, règles métier, droits (SQL)
supabase/seed.sql      les 4 salles
scripts/               comptes de démonstration et recette automatique des règles
src/app/(app)/         pages connectées (membre et gérant)
src/app/(public)/      confidentialité, règlement, accès refusé
src/lib/               dates (heure de Paris), session
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
choix de la stack, reprise du cadrage de la première version no-code, recette écran par écran,
recentrage sur le périmètre du brief. `CLAUDE.md` garde la mémoire du projet : décisions, pièges
rencontrés, vérifications faites.
