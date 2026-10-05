import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'wouter';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import './mobile-navigation.css';

export type MobileNavigationRoute = {
  path: string;
  label: string;
  icon: ComponentType<any>;
};

type MobileNavigationProps = {
  routes: MobileNavigationRoute[];
  location: string;
};

const primaryPaths = ['/user-portal', '/pipeline', '/clients', '/projects', '/money'];

const testIdPart = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function MobileNavigation({ routes, location }: MobileNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousLocation = useRef(location);
  const primaryRoutes = routes.filter((route) => primaryPaths.includes(route.path));
  const secondaryRoutes = routes.filter((route) => !primaryPaths.includes(route.path));
  const activeSecondaryRoute = secondaryRoutes.find((route) => route.path === location);

  useEffect(() => {
    if (previousLocation.current !== location) {
      previousLocation.current = location;
      setMenuOpen(false);
    }
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav className="mobile-navigation" aria-label="Workspace navigation" data-testid="nav-mobile">
      <div className="mobile-navigation__bar" ref={rootRef}>
        <div className="mobile-navigation__primary">
          {primaryRoutes.map(({ path, label, icon: Icon }) => {
            const active = location === path;
            return (
              <Link
                key={path}
                href={path}
                className={`mobile-navigation__link${active ? ' is-active' : ''}`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                data-testid={`mobile-nav-link-${testIdPart(label)}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="mobile-navigation__icon" aria-hidden="true" />
                <span className="mobile-navigation__label">{label}</span>
              </Link>
            );
          })}
        </div>

        {secondaryRoutes.length > 0 && (
          <button
            ref={triggerRef}
            type="button"
            className={`mobile-navigation__more${menuOpen ? ' is-open' : ''}${activeSecondaryRoute ? ' is-active' : ''}`}
            aria-label={
              activeSecondaryRoute
                ? `More destinations, current page: ${activeSecondaryRoute.label}`
                : 'More workspace destinations'
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
            data-testid="button-mobile-nav-more"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {activeSecondaryRoute ? (
              <activeSecondaryRoute.icon className="mobile-navigation__icon" aria-hidden="true" />
            ) : (
              <MoreHorizontal className="mobile-navigation__icon" aria-hidden="true" />
            )}
            <span className="mobile-navigation__label">
              {activeSecondaryRoute?.label ?? 'More'}
            </span>
            <ChevronDown className="mobile-navigation__chevron" aria-hidden="true" />
          </button>
        )}

        {secondaryRoutes.length > 0 && (
          <div
            id="mobile-navigation-menu"
            className="mobile-navigation__menu"
            data-testid="mobile-nav-menu"
            hidden={!menuOpen}
          >
            <p className="mobile-navigation__menu-heading">More on your desk</p>
            {secondaryRoutes.map(({ path, label, icon: Icon }) => {
              const active = location === path;
              return (
                <Link
                  key={path}
                  href={path}
                  className={`mobile-navigation__menu-link${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  data-testid={`mobile-nav-link-${testIdPart(label)}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon className="mobile-navigation__menu-icon" aria-hidden="true" />
                  <span>{label}</span>
                  {active && <span className="mobile-navigation__current">Current page</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
