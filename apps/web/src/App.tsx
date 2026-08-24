import { useStore } from "@nanostores/react";
import { type JSX, useEffect } from "react";
import { SignIn } from "@/components/sign-in";
import { UniversePage } from "@/pages/universe-page";
import { $asked, $viewer, loadViewer } from "@/stores/viewer-store";

export const App = (): JSX.Element | null => {
  const viewer = useStore($viewer);
  const asked = useStore($asked);

  useEffect(() => {
    void loadViewer();
  }, []);

  if (!asked) {
    return null;
  }

  return viewer ? <UniversePage /> : <SignIn />;
};
