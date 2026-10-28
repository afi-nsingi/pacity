import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pt-8 pb-4 text-sm text-muted">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Image src="/pacity-logo.svg" alt="Pacity" width={96} height={26} />
          <p className="mt-2">Vos salles de réunion, réservées en quelques clics.</p>
          <p className="mt-1 text-xs">Une solution conçue par NoCode Factory · MVP, version de démonstration</p>
        </div>
        <div className="flex gap-4 text-xs">
          <Link href="/confidentialite" className="hover:text-accent">Confidentialité</Link>
          <Link href="/reglement" className="hover:text-accent">Règlement intérieur</Link>
        </div>
      </div>
    </footer>
  );
}
