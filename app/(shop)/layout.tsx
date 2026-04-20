import { auth } from '@/lib/auth';
import { Footer } from '@/components/shop/footer';
import { Header } from '@/components/shop/header';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <>
      <Header isAuthenticated={Boolean(session?.user)} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
