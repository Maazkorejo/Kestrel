import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/ide/workspace";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Kestrel - Hunt flaws. Ship armor." },
    { name: "description", content: "Kestrel: AI-native cybersecurity and DevSecOps workspace. Hunt flaws. Ship armor." },
    { property: "og:title", content: "Kestrel - Hunt flaws. Ship armor." },
    { property: "og:description", content: "A security-first development environment for analyzing code, simulating exploits, and applying verified patches." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Workspace,
});
