import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import { NavLink } from '@/components/NavLink';
import { Wordmark } from '@/components/Wordmark';
import { useT } from "@/i18n";

const navLink = "relative inline-flex h-10 items-center whitespace-nowrap text-sm text-muted-foreground transition-colors duration-200 hover:text-ink";
const navActive = "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-signal";

const Header = () => {
  const { isAuthenticated } = useAuth();
  const t = useT();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-rule bg-paper">
      <div className="shell flex h-16 items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-baseline gap-3 rounded-sm" aria-label={t("GraphFusion home")}>
          <Wordmark />
          <span className="hidden text-xs text-muted-foreground lg:inline">{t("Vulnerability Detector")}</span>
        </Link>

        <nav className="flex items-center gap-4 sm:ml-6 sm:gap-5" aria-label={t("Main")}>
          <NavLink to="/analysis" end className={navLink} activeClassName={navActive}>
            {t("New Analysis")}
          </NavLink>
          <NavLink to="/project" className={navLink} activeClassName={navActive}>
            {t("Projects")}
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center">
          <UserProfile />
        </div>
      </div>
    </header>
  );
};

export default Header;
