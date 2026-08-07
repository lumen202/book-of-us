import { PageWaiting } from "@/components/ui/PageWaiting";

export default function BrowseLoading() {
  return (
    <PageWaiting
      title="Looking for somewhere in particular?"
      label="Gathering the map…"
    />
  );
}
