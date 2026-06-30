// Server component: loads the slim library list (off the client list payload)
// and hands it to the client browser for filtering.
import AppHeader from "@/components/AppHeader";
import { getLibrary } from "@/lib/data/library";
import LibraryBrowser from "./LibraryBrowser";

export default function LibraryPage() {
  const exercises = getLibrary();
  return (
    <div className="space-y-4">
      <AppHeader title="Exercise Library" subtitle={`${exercises.length} home-suitable exercises`} />
      <LibraryBrowser exercises={exercises} />
    </div>
  );
}
