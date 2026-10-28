import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Link href="/"><Image src="/pacity-logo.svg" alt="Pacity" width={120} height={32} /></Link>
      <article className="mt-10">{children}</article>
      <Footer />
    </div>
  );
}
