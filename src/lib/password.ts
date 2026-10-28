// Règle commune des mots de passe (Mon compte et réinitialisation).
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_HINT = `Au moins ${PASSWORD_MIN_LENGTH} caractères, avec des lettres et au moins un chiffre.`;

/** Renvoie le problème à afficher, ou null si le nouveau mot de passe convient. */
export function passwordProblem(next: string, confirm: string): string | null {
  if (next.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    return `Choisissez au moins ${PASSWORD_MIN_LENGTH} caractères, avec des lettres et au moins un chiffre.`;
  }
  if (next !== confirm) return "Les deux nouveaux mots de passe ne correspondent pas.";
  return null;
}
