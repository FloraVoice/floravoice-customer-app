import type { Route } from "./+types/home";
import { VoiceChat } from "~/components/voice/VoiceChat";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FloraVoice" },
    { name: "description", content: "Real-time voice AI for FloraVoice" },
  ];
}

export default function Home() {
  return <VoiceChat />;
}
