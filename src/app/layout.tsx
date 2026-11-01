import type { Metadata } from "next";
import "./globals.css";
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: "SuggestDoc",
  description: "Find the right doctor near you in Maharashtra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
   <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
  <script
    dangerouslySetInnerHTML={{
     __html: `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
    }}
  />
</head>
      <body className="min-h-full flex flex-col"> 
      <Navbar />
      {children}
      <Footer />
      </body>
    </html>
  );
}