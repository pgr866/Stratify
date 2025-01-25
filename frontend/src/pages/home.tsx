import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Sponsors } from "@/components/sponsors";
import { About } from "@/components/about";
import { HowItWorks } from "@/components/how-it-works";
import { Features } from "@/components/features";
import { Services } from "@/components/services";
import { Cta } from "@/components/cta";
import { Testimonials } from "@/components/testimonials";
import { Team } from "@/components/team";
import { Pricing } from "@/components/pricing";
import { Newsletter } from "@/components/newsletter";
import { FAQ } from "@/components/faq";
import { Footer } from "@/components/footer";
import { ScrollToTop } from "@/components/scroll-to-top";

export function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Sponsors />
      <About />
      <HowItWorks />
      <Features />
      <Services />
      <Cta />
      <Testimonials />
      <Team />
      <Pricing />
      <Newsletter />
      <FAQ />
      <Footer />
      <ScrollToTop />
    </div>
  )
}
