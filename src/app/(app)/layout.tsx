import Image from "next/image";
import Link from "next/link";
import { BottomBar, ProfileMenu, SidebarLinks } from "@/components/nav";
import { navFor } from "@/components/nav-items";
import { Footer } from "@/components/footer";
import { requireSession } from "@/lib/session";
import { PLAN_LABEL } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  const items = navFor(profile.role);
  const detail = profile.role === "manager" ? "Gérant" : `Abonnement ${profile.plan ? PLAN_LABEL[profile.plan] : ""}`;

  return (
    <div className="min-h-screen md:flex">
      {/* Barre latérale (ordinateur et tablette) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <Link href="/" className="px-2">
          <Image src="/pacity-logo.svg" alt="Pacity" width={120} height={32} priority />
        </Link>
        <div className="mt-8 flex-1">
          <SidebarLinks items={items} />
        </div>
        <ProfileMenu name={profile.full_name} detail={detail} />
      </aside>

      {/* En-tête (téléphone) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/"><Image src="/pacity-logo.svg" alt="Pacity" width={100} height={27} priority /></Link>
        <div className="w-44"><ProfileMenu name={profile.full_name} detail={detail} /></div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 md:pb-10 md:pt-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {children}
          <Footer />
        </div>
      </main>

      <BottomBar items={items} />
    </div>
  );
}
