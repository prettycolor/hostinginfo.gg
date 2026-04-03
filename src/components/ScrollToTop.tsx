import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Automatically scrolls to the top of the page whenever the route changes.
 * This ensures users always start at the top when navigating to a new page,
 * preventing the issue where clicking a button near the footer would load
 * the next page scrolled to the bottom.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
    });
  }, [pathname]); // Trigger whenever the pathname changes

  return null; // This component doesn't render anything
}
