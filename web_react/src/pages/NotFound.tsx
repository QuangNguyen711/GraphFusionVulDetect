import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Wordmark } from "@/components/Wordmark";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main id="main" className="shell flex min-h-dvh flex-col justify-center gap-8 bg-background py-16">
      <Wordmark />
      <div className="ticks max-w-xl px-8 py-10">
        <p className="reading">404</p>
        <h1 className="mt-4 text-2xl">Page not found</h1>
        <p className="code-text mt-2 break-all text-sm text-muted-foreground">{location.pathname}</p>
      </div>
      <Link
        to="/"
        className="self-start text-ink underline decoration-rule-2 underline-offset-4 transition-colors duration-200 hover:text-signal hover:decoration-signal"
      >
        Return to Home
      </Link>
    </main>
  );
};

export default NotFound;
