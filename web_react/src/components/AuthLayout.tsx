import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "@/components/Wordmark";
import { PipelineTrail } from "@/components/Pipeline";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export const AuthLayout = ({ title, description, children }: AuthLayoutProps) => (
  <div className="grid min-h-dvh bg-background lg:grid-cols-2">
    <aside className="hidden border-r border-rule bg-paper-2 lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-16 py-12">
        <Link to="/" className="self-start rounded-sm" aria-label="GraphFusion home">
          <Wordmark />
        </Link>
        <div className="mt-auto max-w-md">
          <p className="mb-8 text-sm text-muted-foreground">Vulnerability Detector</p>
          <PipelineTrail preview />
        </div>
      </div>
    </aside>

    <main id="main" className="flex flex-col px-4 py-10 sm:px-12 lg:justify-center lg:px-16">
      <Link to="/" className="mb-12 self-start rounded-sm lg:hidden" aria-label="GraphFusion home">
        <Wordmark />
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="text-4xl leading-none">{title}</h1>
        <p className="mt-3 text-ink-2">{description}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  </div>
);
