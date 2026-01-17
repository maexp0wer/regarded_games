import '@rainbow-me/rainbowkit/styles.css'; // Import styles ONLY for the app


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
       {children}
    </div>
  );
}