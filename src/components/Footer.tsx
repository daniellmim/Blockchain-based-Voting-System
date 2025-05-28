import React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Button } from "./ui/button";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Logo
              iconOnly={false}
              className="mb-4 [&>span]:text-primary-foreground [&>svg]:text-primary-foreground"
            />
            <p className="text-primary-foreground/80">
              Democratizing decision making through secure digital voting.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-foreground">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#about">About Us</Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#careers">Careers</Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#blog">Blog</Link>
                </Button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-foreground">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#privacy">Privacy</Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#terms">Terms</Link>
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  asChild
                  className="p-0 h-auto text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <Link href="/#security">Security</Link>
                </Button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4 text-primary-foreground">
              Connect
            </h4>
            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="#" aria-label="Twitter">
                  <Twitter className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="#" aria-label="LinkedIn">
                  <Linkedin className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="#" aria-label="GitHub">
                  <Github className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-primary-foreground/70">
          <p>&copy; {currentYear} BVS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
