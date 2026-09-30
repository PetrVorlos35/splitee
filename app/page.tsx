import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { HomeClient, Landing } from "./HomeClient";

export default async function Home() {
  // Klientské <Unauthenticated> se na serveru vyrenderuje jako spinner, takže
  // crawlery (Google, Seznam) a náhledy odkazů by neviděly žádný text.
  // Nepřihlášenému proto pošleme úvodní obrazovku rovnou v HTML.
  if (!(await isAuthenticatedNextjs())) {
    return (
      <main>
        <Landing />
      </main>
    );
  }
  return <HomeClient />;
}
