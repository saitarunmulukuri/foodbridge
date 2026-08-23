import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { UtensilsCrossed, LogOut, ChevronLeft } from 'lucide-react';
import './PillNav.css';

/**
 * PillNav — FoodBridge Unified Navigation (React Bits component).
 *
 * Supports:
 * - GSAP hover bubble animation (circle rises from bottom) on all nav pills and CTA
 * - Dual label stack (label slides up, hover label slides in)
 * - Smooth collapse / expand interaction (250–350ms easing)
 * - In collapsed state: ONLY the FoodBridge logo/name remains.
 * - Clicking the collapsed logo expands the navigation.
 * - In expanded state: Clicking logo navigates to "/".
 * - Dedicated public & authenticated routes: /, /how-it-works, /impact, /about, /login, /register, /profile, etc.
 */
export const PillNav = ({
  logo,
  logoAlt = 'FoodBridge',
  logoHref = '/',
  items = [],
  activeHref,
  className = '',
  ease = 'power2.out',
  baseColor = '#FFFFFF',
  pillColor = '#F8F9FB',
  hoveredPillTextColor = '#FFFFFF',
  pillTextColor = '#101828',
  onMobileMenuClick,
  initialLoadAnimation = true,
  isAuthNav = false,
  ctaItem,
  rightSlot,
  mobileRightItems = [],
}) => {
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const circleRefs = useRef([]);
  const tlRefs = useRef([]);
  const activeTweenRefs = useRef([]);
  const ctaCircleRef = useRef(null);
  const ctaTlRef = useRef(null);
  const ctaTweenRef = useRef(null);
  const hamburgerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const navItemsRef = useRef(null);
  const logoRef = useRef(null);

  // ── GSAP layout for pill hover bubbles ────────────────────────────
  const setupLayout = useCallback(() => {
    try {
      // Setup for standard items
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        if (w === 0 || h === 0) return;

        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector('.pill-label');
        const hoverLabel = pill.querySelector('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (hoverLabel) gsap.set(hoverLabel, { y: h + 10, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.25, xPercent: -50, duration: 0.32, ease, overwrite: 'auto' }, 0);

        if (label) {
          tl.to(label, { y: -(h + 6), duration: 0.32, ease, overwrite: 'auto' }, 0);
        }

        if (hoverLabel) {
          gsap.set(hoverLabel, { y: Math.ceil(h + 10), opacity: 0 });
          tl.to(hoverLabel, { y: 0, opacity: 1, duration: 0.32, ease, overwrite: 'auto' }, 0);
        }

        tlRefs.current[index] = tl;
      });

      // Setup for CTA item if present (e.g. Create Donation)
      if (ctaCircleRef.current?.parentElement) {
        const circle = ctaCircleRef.current;
        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        if (w > 0 && h > 0) {
          const R = ((w * w) / 4 + h * h) / (2 * h);
          const D = Math.ceil(2 * R) + 2;
          const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
          const originY = D - delta;

          circle.style.width = `${D}px`;
          circle.style.height = `${D}px`;
          circle.style.bottom = `-${delta}px`;

          gsap.set(circle, {
            xPercent: -50,
            scale: 0,
            transformOrigin: `50% ${originY}px`,
          });

          const label = pill.querySelector('.pill-label');
          const hoverLabel = pill.querySelector('.pill-label-hover');

          if (label) gsap.set(label, { y: 0 });
          if (hoverLabel) gsap.set(hoverLabel, { y: h + 10, opacity: 0 });

          ctaTlRef.current?.kill();
          const tl = gsap.timeline({ paused: true });

          tl.to(circle, { scale: 1.25, xPercent: -50, duration: 0.32, ease, overwrite: 'auto' }, 0);

          if (label) {
            tl.to(label, { y: -(h + 6), duration: 0.32, ease, overwrite: 'auto' }, 0);
          }

          if (hoverLabel) {
            gsap.set(hoverLabel, { y: Math.ceil(h + 10), opacity: 0 });
            tl.to(hoverLabel, { y: 0, opacity: 1, duration: 0.32, ease, overwrite: 'auto' }, 0);
          }

          ctaTlRef.current = tl;
        }
      }
    } catch (e) {
      console.warn('PillNav layout calculation non-fatal warning:', e);
    }
  }, [ease]);

  useEffect(() => {
    setupLayout();

    const onResize = () => setupLayout();
    window.addEventListener('resize', onResize);
    if (document.fonts?.ready) {
      document.fonts.ready.then(setupLayout).catch(() => {});
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 0.95 });
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current;
      const navItemsEl = navItemsRef.current;
      if (logoEl) {
        gsap.fromTo(logoEl, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease });
      }
      if (navItemsEl) {
        gsap.fromTo(navItemsEl, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease, delay: 0.08 });
      }
    }

    return () => window.removeEventListener('resize', onResize);
  }, [setupLayout, items, ctaItem, ease, initialLoadAnimation]);

  // Re-run bubble layout when expanding
  useEffect(() => {
    if (!isCollapsed) {
      const timer = setTimeout(setupLayout, 320);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed, setupLayout]);

  const handleEnter = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.22, ease, overwrite: 'auto' });
  };

  const handleLeave = (i) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.18, ease, overwrite: 'auto' });
  };

  const handleCtaEnter = () => {
    const tl = ctaTlRef.current;
    if (!tl) return;
    ctaTweenRef.current?.kill();
    ctaTweenRef.current = tl.tweenTo(tl.duration(), { duration: 0.22, ease, overwrite: 'auto' });
  };

  const handleCtaLeave = () => {
    const tl = ctaTlRef.current;
    if (!tl) return;
    ctaTweenRef.current?.kill();
    ctaTweenRef.current = tl.tweenTo(0, { duration: 0.18, ease, overwrite: 'auto' });
  };

  // ── Mobile Menu Toggle ────────────────────────────────────────────
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3.5, duration: 0.22, ease });
        gsap.to(lines[1], { rotation: -45, y: -3.5, duration: 0.22, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.22, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.22, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 6, scaleY: 0.96 },
          { opacity: 1, y: 0, scaleY: 1, duration: 0.22, ease, transformOrigin: 'top center' }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 6,
          scaleY: 0.96,
          duration: 0.18,
          ease,
          transformOrigin: 'top center',
          onComplete: () => gsap.set(menu, { visibility: 'hidden' }),
        });
      }
    }

    onMobileMenuClick?.();
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // ── Logo click handling (Expanded: navigate to '/', Collapsed: expand) ──
  const handleLogoClick = (e) => {
    if (isCollapsed) {
      e.preventDefault();
      e.stopPropagation();
      setIsCollapsed(false);
    } else {
      const targetHref = logoHref || '/';
      if (location.pathname === targetHref) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // ── Collapse Button Click ─────────────────────────────────────────
  const handleCollapseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCollapsed(true);
  };

  const isExternalLink = (href) =>
    !href ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:');

  const isRouterLink = (href) => Boolean(href) && !isExternalLink(href);

  /* Active detection: supports exact home and nested routes */
  const getIsActive = (item) => {
    if (!item) return false;
    if (item.isActive !== undefined) return item.isActive;
    const currentPath = activeHref || location.pathname;
    if (!item.href) return false;

    if (item.href === '/') {
      return currentPath === '/';
    }

    if (item.activePrefix) return currentPath.startsWith(item.activePrefix);
    return currentPath === item.href;
  };

  const homeHref = logoHref || '/';

  const cssVars = {
    '--base': baseColor,
    '--pill-bg': pillColor,
    '--hover-text': hoveredPillTextColor,
    '--pill-text': pillTextColor,
  };

  const renderPillLink = (item, i) => {
    const isActive = getIsActive(item);
    const ctaClass = item.isCta ? ' pill-cta' : '';
    const activeClass = isActive ? ' is-active' : '';
    const circleRef = (el) => { circleRefs.current[i] = el; };
    const Icon = item.icon;

    const inner = (
      <>
        <span className="hover-circle" aria-hidden="true" ref={circleRef} />
        <span className="label-stack">
          <span className="pill-label flex items-center gap-1.5">
            {Icon && <Icon size={14} className="shrink-0 text-slate-500" />}
            <span>{item.label}</span>
          </span>
          <span className="pill-label-hover flex items-center gap-1.5" aria-hidden="true">
            {Icon && <Icon size={14} className="shrink-0 text-white" />}
            <span>{item.label}</span>
          </span>
        </span>
      </>
    );

    if (isRouterLink(item.href)) {
      return (
        <Link
          role="menuitem"
          to={item.href}
          className={`pill${activeClass}${ctaClass}`}
          aria-label={item.ariaLabel || item.label}
          aria-current={isActive ? 'page' : undefined}
          onMouseEnter={() => handleEnter(i)}
          onMouseLeave={() => handleLeave(i)}
        >
          {inner}
        </Link>
      );
    }
    return (
      <a
        role="menuitem"
        href={item.href}
        className={`pill${activeClass}${ctaClass}`}
        aria-label={item.ariaLabel || item.label}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={() => handleEnter(i)}
        onMouseLeave={() => handleLeave(i)}
      >
        {inner}
      </a>
    );
  };

  // Render CTA pill with matching hover bubble & label stack animation
  const renderCtaPill = (item) => {
    if (!item) return null;
    const isActive = getIsActive(item);
    const activeClass = isActive ? ' is-active' : '';

    const inner = (
      <>
        <span className="hover-circle" aria-hidden="true" ref={ctaCircleRef} style={{ background: '#FF5A36' }} />
        <span className="label-stack">
          <span className="pill-label">{item.label}</span>
          <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
        </span>
      </>
    );

    if (isRouterLink(item.href)) {
      return (
        <Link
          role="menuitem"
          to={item.href}
          className={`pill pill-cta${activeClass}`}
          aria-label={item.ariaLabel || item.label}
          aria-current={isActive ? 'page' : undefined}
          onMouseEnter={handleCtaEnter}
          onMouseLeave={handleCtaLeave}
          id="auth-create-donation-btn"
        >
          {inner}
        </Link>
      );
    }
    return (
      <a
        role="menuitem"
        href={item.href}
        className={`pill pill-cta${activeClass}`}
        aria-label={item.ariaLabel || item.label}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={handleCtaEnter}
        onMouseLeave={handleCtaLeave}
        id="auth-create-donation-btn"
      >
        {inner}
      </a>
    );
  };

  return (
    <div className={`pill-nav-container${isAuthNav ? ' auth-nav' : ''}`}>
      <nav
        className={`pill-nav ${isCollapsed ? 'is-collapsed' : 'is-expanded'} ${className}`}
        aria-label="Primary"
        style={cssVars}
      >

        {/* Brand Logo & Name (Clickable Home / Expand trigger) */}
        {isRouterLink(homeHref) ? (
          <Link
            className="pill-logo"
            to={isCollapsed ? '#' : homeHref}
            aria-label={isCollapsed ? 'Expand navigation' : logoAlt}
            role="menuitem"
            ref={logoRef}
            onClick={handleLogoClick}
            title={isCollapsed ? 'Click to expand navigation' : 'FoodBridge Home'}
          >
            {logo ? (
              <img src={logo} alt={logoAlt} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="pill-logo-badge">
                <UtensilsCrossed size={16} strokeWidth={2.4} />
              </div>
            )}
            <span className="pill-logo-text">FoodBridge</span>
          </Link>
        ) : (
          <a
            className="pill-logo"
            href={isCollapsed ? '#' : homeHref}
            aria-label={isCollapsed ? 'Expand navigation' : logoAlt}
            role="menuitem"
            ref={logoRef}
            onClick={handleLogoClick}
            title={isCollapsed ? 'Click to expand navigation' : 'FoodBridge Home'}
          >
            {logo ? (
              <img src={logo} alt={logoAlt} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="pill-logo-badge">
                <UtensilsCrossed size={16} strokeWidth={2.4} />
              </div>
            )}
            <span className="pill-logo-text">FoodBridge</span>
          </a>
        )}

        {/* Collapsible Container (Nav Items + CTA Slot + Right Slot + Collapse Button) */}
        <div className="pill-nav-collapsible desktop-only">
          {/* Desktop Nav Items (center: Overview, My Donations, Impact, Profile) */}
          <div className="pill-nav-center">
            <div className="pill-nav-items" ref={navItemsRef}>
              <ul className="pill-list" role="menubar">
                {items.map((item, i) => (
                  <li key={item.href || `item-${i}`} role="none">
                    {renderPillLink(item, i)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Item with matching hover bubble & label stack animation (Create Donation) */}
          {ctaItem && (
            <div className="pill-nav-cta-slot">
              {renderCtaPill(ctaItem)}
            </div>
          )}

          {/* Right Slot (Direct Sign Out Action) */}
          {rightSlot && (
            <div className="pill-nav-right">
              {rightSlot}
            </div>
          )}

          {/* Circular Collapse Button */}
          <button
            type="button"
            className="pill-collapse-button"
            onClick={handleCollapseClick}
            aria-label="Collapse navigation"
            title="Collapse navigation"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Mobile Hamburger (for mobile viewports) */}
        <button
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* Mobile Popover */}
      <div className="mobile-menu-popover" ref={mobileMenuRef}>
        <ul className="mobile-menu-list">
          {items.map((item, i) => {
            const isActive = getIsActive(item);
            return (
              <li key={item.href || `mobile-item-${i}`}>
                {isRouterLink(item.href) ? (
                  <Link
                    to={item.href}
                    className={`mobile-menu-link${isActive ? ' is-active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <span>{item.label}</span>
                    {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', flexShrink: 0 }} />}
                  </Link>
                ) : (
                  <a href={item.href} className={`mobile-menu-link${isActive ? ' is-active' : ''}`} onClick={closeMobileMenu}>
                    <span>{item.label}</span>
                  </a>
                )}
              </li>
            );
          })}

          {/* Extra mobile items (role info + logout) */}
          {mobileRightItems.length > 0 && (
            <>
              <li><div className="mobile-menu-divider" /></li>
              {mobileRightItems.map((item, i) => {
                if (item.type === 'link') {
                  return (
                    <li key={`mr-${i}`}>
                      <Link to={item.href} className="mobile-menu-link" onClick={() => { closeMobileMenu(); item.onClick?.(); }}>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                }
                if (item.type === 'label') {
                  return <li key={`mr-${i}`}><div className="mobile-menu-role-label">{item.label}</div></li>;
                }
                if (item.type === 'logout') {
                  return (
                    <li key={`mr-${i}`}>
                      <button
                        className="mobile-menu-logout"
                        onClick={() => { closeMobileMenu(); item.onClick?.(); }}
                      >
                        <LogOut size={15} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                }
                return null;
              })}
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;
