import { startTransition, type FormEvent } from "react";

/**
 * Envoie un formulaire à une action serveur sans le réinitialiser.
 * Avec `<form action={…}>`, React 19 remet chaque champ à sa valeur initiale après l'envoi :
 * après un refus (« Solde insuffisant »), l'écran afficherait une autre salle que celle
 * réellement choisie. Ici, on envoie les mêmes données sans cette remise à zéro.
 * La validation du navigateur (champs `required`) a lieu avant l'événement `submit`.
 */
export function submitWithoutReset(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}
