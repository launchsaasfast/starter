'use client'

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message && message.includes('Confirmation')) {
      // Rediriger vers la page de confirmation avec le message
      router.push(`/settings/email-confirmation?message=${encodeURIComponent(message)}`);
    }
  }, [searchParams, router]);
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <Badge variant="secondary" className="mb-4 bg-white text-black hover:bg-gray-200">
            ✨ Fast SaaS Starter
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
            Launch Your SaaS
            <br />
            <span className="text-gray-300">
              In Record Time
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A modern, production-ready starter template with authentication, payments, 
            and everything you need to launch your SaaS application.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-8">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="lg" className="px-8 border-white text-white hover:bg-white hover:text-black">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-white">Everything You Need</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Built with modern technologies and best practices to help you ship faster.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-black" />
              </div>
              <CardTitle className="text-white">Secure Authentication</CardTitle>
              <CardDescription className="text-gray-400">
                Complete auth system with social login, email verification, and password reset.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-black" />
              </div>
              <CardTitle className="text-white">Fast Development</CardTitle>
              <CardDescription className="text-gray-400">
                Modern stack with Next.js, TypeScript, Tailwind CSS, and shadcn/ui components.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-black" />
              </div>
              <CardTitle className="text-white">User Management</CardTitle>
              <CardDescription className="text-gray-400">
                Complete user dashboard with settings, profile management, and more.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4 text-white">Ready to Launch?</h3>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who have shipped their SaaS applications faster with our starter template.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-8">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="h-6 w-6 bg-white rounded"></div>
              <span className="font-semibold text-white">LaunchSaaS</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2025 LaunchSaaS. Built with Next.js and shadcn/ui.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
