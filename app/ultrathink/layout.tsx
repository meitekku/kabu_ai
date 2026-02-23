export const metadata = {
  robots: { index: false },
};

export default function UltraThinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
