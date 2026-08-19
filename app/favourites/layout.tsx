import { ProtectedPage } from "../components/ProtectedPage";

export default function FavouritesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/favourites">{children}</ProtectedPage>;
}
