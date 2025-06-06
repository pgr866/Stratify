import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { Navbar } from "./components/navbar";
import { ScrollToTop } from "./components/scroll-to-top";
import { TechStack } from "./components/tech-stack";

export function Home() {
  return (
    <div className="max-w-screen-xl mx-auto px-2">
      <Navbar />
      <Hero />
      <TechStack />
      <Footer />
      <ScrollToTop />
    </div>
  )
}
