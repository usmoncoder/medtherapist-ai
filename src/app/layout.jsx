import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "MedTherapist AI",
  description: "Terapevtlar va bemorlar uchun raqamli klinika",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F5FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0C18" },
  ],
};

// Sahifa chizilishidan oldin mavzu va tilni qo'yamiz — aks holda oq ekran "chaqnaydi"
const BOOT = `try{
  var d=document.documentElement;
  d.dataset.theme=localStorage.getItem('mt-theme')==='dark'?'dark':'light';
  var l=localStorage.getItem('mt-lang');
  d.lang=l==='ru'?'ru':'uz';
}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="uz" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
