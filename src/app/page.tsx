
"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import {
  ClipboardCheck,
  BarChartHorizontalBig,
  Lock,
  DoorOpen,
  Share2,
  Vote,
  Users,
  Building,
  School,
  LogIn,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";


export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/#about", label: "About Us" },
    { href: "/#contact", label: "Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-r from-secondary/20 to-background" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Navigation Bar */}
      <header className="bg-transparent text-foreground px-4 sm:px-6 py-4 w-full top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Logo size="md" />
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 items-center">
            {navLinks.map(link => (
              <Button variant="link" asChild key={link.href}>
                <Link href={link.href} className="hover:text-primary/80 transition-colors">
                  {link.label}
                </Link>
              </Button>
            ))}
            <Button
              variant="outline"
              asChild
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          </nav>
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <SheetHeader className="p-6 pb-2 sr-only"> {/* Added sr-only for accessibility, visual title in Logo */}
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 p-6 pt-2">
                  <div className="mb-4">
                     <Logo size="sm" />
                  </div>
                  {navLinks.map(link => (
                    <SheetClose asChild key={link.href}>
                      <Link href={link.href} className="text-lg hover:text-primary/80 transition-colors py-2">
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      asChild
                      className="border-primary text-primary hover:bg-primary/10 mt-4"
                    >
                      <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" /> Login
                      </Link>
                    </Button>
                  </SheetClose>
                   <SheetClose asChild>
                     <Button
                      size="lg"
                      asChild
                      className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md mt-2"
                    >
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-[calc(80vh-var(--header-height,4rem))] flex items-center justify-center py-12 px-4">
        <div className="container mx-auto text-center flex flex-col items-center">
          <div className="relative w-full max-w-2xl lg:max-w-4xl aspect-video md:min-h-[400px] lg:min-h-[450px] flex flex-col justify-center items-center p-6 sm:p-8 rounded-lg shadow-xl mb-8 overflow-hidden">
            <Image
              src="/images/landing-hero.png"
              alt="Empowering decisions background"
              layout="fill"
              objectFit="cover"
              quality={75}
              className="z-0"
              data-ai-hint="collaboration teamwork"
              priority
            />
            <div className="relative z-10 p-6 sm:p-8 rounded-md">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-black mb-4">
                Empower Your Decision
              </h1>
              <p className="text-md sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8">
                Create, vote, and collaborate on decisions that matter.
              </p>
              <p className="text-sm sm:text-md text-gray-600 mb-6 sm:mb-8">
                BVS lets you design secure, real-time ballots for teams,
                communities, or events. Make every voice count.
              </p>
              <Button
                size="lg"
                asChild
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 bg-muted">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8 sm:mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <ClipboardCheck className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Design Custom Ballots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Build polls with multiple options, deadlines, and privacy
                  settings.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <BarChartHorizontalBig className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Live Voting Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Watch votes tally up instantly and visualize outcomes.
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Safe & Transparent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">
                  End-to-end encryption and anonymous voting options.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8 sm:mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-4">
              <div className="p-4 bg-accent/10 rounded-full w-fit mb-4">
                <DoorOpen className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Create a Room
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Name your room and set rules.
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="p-4 bg-accent/10 rounded-full w-fit mb-4">
                <Share2 className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Share the Link
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Invite participants via email or link.
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="p-4 bg-accent/10 rounded-full w-fit mb-4">
                <Vote className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Vote & Decide
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Collect votes and announce results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-12 sm:py-16 bg-secondary/30">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8 sm:mb-12">
            Use Cases
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Team Decisions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">Choose a project name.</p>
              </CardContent>
            </Card>
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <Building className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Community Polls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">Vote on event dates.</p>
              </CardContent>
            </Card>
            <Card className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
              <CardHeader className="items-center">
                <div className="p-3 bg-primary/10 rounded-md w-fit mb-4 mx-auto">
                  <School className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                  Classroom Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm sm:text-base">Engage students live.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8 sm:mb-12">
            What Our Users Say
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-8 max-w-3xl mx-auto bg-card p-6 sm:p-8 rounded-xl shadow-lg">
            <Image
              src="/images/testimonial-user.png"
              alt="Testimonial user"
              width={120}
              height={120}
              className="rounded-full sm:w-[150px] sm:h-[150px]"
              data-ai-hint="professional portrait"
            />
            <div className="max-w-2xl text-center md:text-left">
              <blockquote className="text-lg sm:text-xl text-muted-foreground italic mb-4">
                &ldquo;BVS streamlined our boardroom voting—no more endless
                email threads!&rdquo;
              </blockquote>
              <p className="font-bold text-accent text-sm sm:text-base">
                – Jane D., Project Manager
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 bg-accent">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent-foreground mb-6">
            Ready to Empower Your Decisions?
          </h2>
          <p className="text-lg sm:text-xl text-accent-foreground/80 mb-8">
            Join thousands of teams and communities making better choices.
          </p>
          <Button
            size="lg"
            asChild
            className="bg-accent-foreground text-accent hover:bg-accent-foreground/90 shadow-md text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
          >
            <Link href="/signup">Get Started Now</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
