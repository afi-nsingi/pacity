/* eslint-disable @next/next/no-img-element */
import { DoorOpen } from "lucide-react";

/** Photo de la salle, ou visuel aux couleurs Pacity si aucune photo n'est fournie. */
export function RoomPhoto({ url, name, className = "" }: { url: string | null; name: string; className?: string }) {
  if (url) return <img src={url} alt={name} className={`h-full w-full object-cover ${className}`} />;
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-accent-soft to-mustard-soft ${className}`}>
      <DoorOpen className="h-10 w-10 text-accent" strokeWidth={1.5} />
    </div>
  );
}
