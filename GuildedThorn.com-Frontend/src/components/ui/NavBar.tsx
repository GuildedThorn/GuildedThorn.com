import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
  Settings,
  User as UserIcon,
} from "lucide-react";
import {
  FaBook,
  FaCode,
  FaEnvelope,
  FaHeart,
  FaImages,
  FaScroll,
  FaStream,
  FaTools,
} from "react-icons/fa";
import { PiNetwork } from "react-icons/pi";
import { FaRadio } from "react-icons/fa6";
import { cn } from "@lib/utils";
import { useAuth } from "@components/AuthContext";
import { Avatar } from "@components/ui/Avatar";
import { getDonationConfig, logout } from "@backend/api";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

// Top-level links are grouped into themed menus so the bar stays compact as the
// site grows. Add a new page by dropping it into the right group below.
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Live",
    items: [
      { to: "/stream", label: "Stream", icon: <FaStream className="text-base" /> },
      { to: "/radio", label: "Radio", icon: <FaRadio className="text-base" /> },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/projects", label: "Projects", icon: <FaCode className="text-base" /> },
      { to: "/blog/pages", label: "Blog", icon: <FaScroll className="text-base" /> },
      { to: "/gallery/images/", label: "Gallery", icon: <FaImages className="text-base" /> },
      { to: "/net", label: "Network", icon: <PiNetwork className="text-base" /> },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/guestbook", label: "Guestbook", icon: <FaBook className="text-base" /> },
      { to: "/tools", label: "Tools", icon: <FaTools className="text-base" /> },
      { to: "/contact", label: "Contact", icon: <FaEnvelope className="text-base" /> },
    ],
  },
];

// True when the current path belongs to any item in the group (for highlighting
// the group's trigger). Items are root-relative; trailing slashes are ignored.
function groupIsActive(items: NavItem[], pathname: string) {
  return items.some((i) => {
    const base = i.to.replace(/\/+$/, "");
    return pathname === base || pathname.startsWith(base + "/");
  });
}

// A click/hover dropdown that closes on outside click, Escape, or navigation.
function Dropdown({
  trigger,
  active,
  align = "left",
  children,
}: {
  trigger: ReactNode;
  active?: boolean;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("nav-link", (open || active) && "bg-muted text-primary")}
      >
        {trigger}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        // Anchored at top-full (no dead gap) with a transparent pt-1 bridge so
        // moving the cursor from the trigger to an item stays inside the
        // element — otherwise crossing a margin gap fires onMouseLeave and the
        // menu closes before you can click.
        <div
          className={cn(
            "absolute top-full z-50 pt-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="min-w-[12rem] rounded-xl border border-border bg-card p-1 shadow-lg">
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn("nav-link w-full", isActive && "bg-muted text-primary");

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, loading, refresh } = useAuth();
  const { pathname } = useLocation();

  // Donate link is hidden until donations are published (owners always see it).
  // Re-checked when auth state settles so the owner's link appears after login.
  const [donateEnabled, setDonateEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    getDonationConfig()
      .then((c) => alive && setDonateEnabled(c.enabled))
      .catch(() => alive && setDonateEnabled(false));
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    await refresh();
    closeMenu();
  };

  // Mobile auth block (shown inside the hamburger sheet).
  const mobileAuth = loading ? null : isAuthenticated ? (
    <>
      <Link to="/settings" className="nav-link w-full" onClick={closeMenu}>
        <Avatar src={user?.avatarUrl} name={user?.name} className="h-6 w-6 shrink-0 text-[10px]" />
        <span className="truncate">{user?.name || "Account"}</span>
      </Link>
      <NavLink to={`/u/${user?.name}`} className={itemClass} onClick={closeMenu}>
        <UserIcon className="h-4 w-4" />
        My profile
      </NavLink>
      <button onClick={handleLogout} className="nav-link w-full">
        <LogOut className="h-4 w-4 text-destructive" />
        Logout
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="nav-link w-full" onClick={closeMenu}>
        <LogIn className="h-4 w-4" />
        Login
      </Link>
      <Link
        to="/register"
        onClick={closeMenu}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm
					font-medium text-primary-foreground transition-colors hover:bg-primary/90
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserPlus className="h-4 w-4" />
        Register
      </Link>
    </>
  );

  return (
    <div className="sticky top-0 z-40 px-3 pt-3">
      <nav className="mx-auto max-w-7xl rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
            <img src="/images/Logo.svg" alt="GuildedThorn logo" className="h-10 w-10" />
            <span className="text-xl font-extrabold tracking-tight text-primary max-[360px]:hidden">
              GuildedThorn
            </span>
          </Link>

          {/* Desktop: grouped menus + donate + account */}
          <div className="hidden items-center gap-1 lg:flex">
            {GROUPS.map((group) => (
              <Dropdown
                key={group.label}
                trigger={group.label}
                active={groupIsActive(group.items, pathname)}
              >
                {(close) =>
                  group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} className={itemClass} onClick={close}>
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))
                }
              </Dropdown>
            ))}

            {donateEnabled && (
              <NavLink
                to="/donate"
                className={({ isActive }) =>
                  cn("nav-link text-primary", isActive && "bg-muted")
                }
              >
                <FaHeart className="text-base" />
                Donate
              </NavLink>
            )}

            <span className="mx-1 h-6 w-px bg-border" />

            {loading ? null : isAuthenticated ? (
              <Dropdown
                align="right"
                trigger={
                  <span className="flex items-center gap-2">
                    <Avatar
                      src={user?.avatarUrl}
                      name={user?.name}
                      className="h-6 w-6 shrink-0 text-[10px]"
                    />
                    <span className="max-w-[8rem] truncate">{user?.name || "Account"}</span>
                  </span>
                }
              >
                {(close) => (
                  <>
                    <NavLink to="/settings" className={itemClass} onClick={close}>
                      <Settings className="h-4 w-4" />
                      Settings
                    </NavLink>
                    <NavLink to={`/u/${user?.name}`} className={itemClass} onClick={close}>
                      <UserIcon className="h-4 w-4" />
                      My profile
                    </NavLink>
                    <button
                      onClick={() => {
                        close();
                        handleLogout();
                      }}
                      className="nav-link w-full"
                    >
                      <LogOut className="h-4 w-4 text-destructive" />
                      Logout
                    </button>
                  </>
                )}
              </Dropdown>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={closeMenu}>
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm
								font-medium text-primary-foreground transition-colors hover:bg-primary/90
								focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-foreground/80 transition-colors hover:bg-muted
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu: groups as labeled sections */}
        {menuOpen && (
          <div className="border-t border-border px-3 pb-3 pt-2 lg:hidden">
            <div className="flex flex-col gap-1">
              {GROUPS.map((group) => (
                <div key={group.label} className="mb-1">
                  <p className="eyebrow px-2 pb-0.5 pt-2">{group.label}</p>
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} className={itemClass} onClick={closeMenu}>
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}

              {donateEnabled && (
                <NavLink
                  to="/donate"
                  className={({ isActive }) =>
                    cn("nav-link w-full text-primary", isActive && "bg-muted")
                  }
                  onClick={closeMenu}
                >
                  <FaHeart className="text-base" />
                  Donate
                </NavLink>
              )}

              <span className="my-2 h-px bg-border" />
              {mobileAuth}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
