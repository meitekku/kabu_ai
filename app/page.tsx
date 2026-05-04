import TopChatShell from "@/components/top/TopChatShell";
import { metadata } from './metadata';

export { metadata };
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <section className="w-full h-[calc(100dvh-2rem)] md:h-[calc(100dvh-0px)]">
      <TopChatShell />
    </section>
  );
}
