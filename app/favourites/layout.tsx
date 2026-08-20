import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Favourite tutors", "Your private tutor shortlist.");

export default function FavouritesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/favourites">{children}</ProtectedPage>;
}
