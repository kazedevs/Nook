import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { DemoVideo } from "../components/DemoVideo";
import { Features } from "../components/Features";
import { Download } from "../components/Download";
import { Footer } from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <Hero />
      <DemoVideo />
      <Features />
      <Download />
      <Footer />
    </div>
  );
}
