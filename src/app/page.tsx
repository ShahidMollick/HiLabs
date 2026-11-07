import { ProvenanceProvider } from "@/components/provenance";
import { ScopeNote } from "@/components/scope";
import { Intro } from "@/components/intro";
import { Tour } from "@/components/tour";
import { TodayBoard } from "@/components/today-board";

export default function TodayPage() {
  return (
    <ProvenanceProvider>
      <TodayBoard />
      <Tour />
      <ScopeNote />
      <Intro />
    </ProvenanceProvider>
  );
}
