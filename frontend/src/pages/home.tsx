import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Sponsors } from "@/components/sponsors";
import { About } from "@/components/about";
import { HowItWorks } from "@/components/how-it-works";
import { Features } from "@/components/features";

export function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Sponsors />
      <About />
      <HowItWorks />
      <Features />
    </div>
  )
}