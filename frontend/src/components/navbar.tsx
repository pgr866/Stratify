import { useState } from "react";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle"

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "#features",
    label: "Features",
  },
  {
    href: "#testimonials",
    label: "Testimonials",
  },
  {
    href: "#pricing",
    label: "Pricing",
  },
  {
    href: "#faq",
    label: "FAQ",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <header className="mt-1">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="flex justify-between w-screen max-w-[90vw] h-14 gap-8">
          <NavigationMenuItem className="font-bold">
            <a rel="noreferrer noopener" href="/home">
              <h4 className="flex gap-2">
                <img src="/logo.svg" alt="Logo" className="logo size-[2rem]" />
                Stratify
              </h4>
            </a>
          </NavigationMenuItem>

          {/* Mobile */}
          <span className="flex md:hidden">
            <Sheet
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SheetTrigger className="px-2">
                <Menu
                  className="flex md:hidden h-5 w-5"
                  onClick={() => setIsOpen(true)}
                >
                </Menu>
              </SheetTrigger>

              <SheetContent side={"left"}>
                <SheetHeader>
                  <SheetTitle className="text-center">
                    Stratify
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                  {routeList.map(({ href, label }: RouteProps) => (
                    <a rel="noreferrer noopener" href={href} key={label} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost">
                        {label}
                      </Button>
                    </a>
                  ))}
                  <a rel="noreferrer noopener" href="https://github.com/pgr866/TFG" target="_blank">
                    <Button variant="secondary">
                      <GitHubLogoIcon />
                      GitHub
                    </Button>
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
            <ThemeToggle />
          </span>

          {/* Desktop */}
          <nav className="hidden md:flex gap-2">
            {routeList.map(({ href, label }: RouteProps) => (
              <a rel="noreferrer noopener" href={href} key={label}>
                <Button variant="ghost">
                  {label}
                </Button>
              </a>
            ))}
          </nav>

          <div className="hidden md:flex gap-2">
            <a rel="noreferrer noopener" href="https://github.com/pgr866/TFG" target="_blank">
              <Button variant="secondary">
                <GitHubLogoIcon />
                GitHub
              </Button>
            </a>
            <ThemeToggle />
          </div>
        </NavigationMenuList>
      </NavigationMenu>
      <Separator className="absolute left-0 w-full"/>
    </header>
  );
};
