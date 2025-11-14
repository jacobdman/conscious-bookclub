/**
 * Global handler for mobile input focus to ensure proper viewport adjustment.
 * This is set up once in Layout.js and handles all inputs automatically.
 * 
 * For inputs that are sticky/fixed positioned (like FeedSection), we don't scroll
 * to avoid pushing the header out of view.
 */
export const setupMobileInputFocusHandler = () => {
  // Check if we're on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window);

  if (!isMobile) return () => {}; // No-op cleanup

  const handleFocus = (event) => {
    const input = event.target;
    if (!input || (input.tagName !== 'INPUT' && input.tagName !== 'TEXTAREA')) return;

    // Check if input is inside a sticky/fixed positioned element
    // If so, don't scroll - let the browser handle it naturally
    let element = input.parentElement;
    while (element && element !== document.body) {
      const style = window.getComputedStyle(element);
      if (style.position === 'sticky' || style.position === 'fixed') {
        return; // Don't scroll for sticky/fixed inputs
      }
      element = element.parentElement;
    }

    // For other inputs, use a small delay to let browser process focus first
    setTimeout(() => {
      if (window.visualViewport) {
        const rect = input.getBoundingClientRect();
        const viewportHeight = window.visualViewport.height;
        
        // Only scroll if input is covered by keyboard
        if (rect.bottom > viewportHeight) {
          // Try to find a scrollable parent container first
          let scrollContainer = input.parentElement;
          while (scrollContainer && scrollContainer !== document.body) {
            const style = window.getComputedStyle(scrollContainer);
            if (style.overflow === 'auto' || style.overflowY === 'auto' || 
                style.overflow === 'scroll' || style.overflowY === 'scroll') {
              // Found a scroll container - scroll within it
              const containerRect = scrollContainer.getBoundingClientRect();
              const inputTopInContainer = rect.top - containerRect.top + scrollContainer.scrollTop;
              scrollContainer.scrollTo({
                top: inputTopInContainer - (containerRect.height / 2),
                behavior: 'smooth',
              });
              return;
            }
            scrollContainer = scrollContainer.parentElement;
          }
          
          // No scroll container found, use scrollIntoView but only if really needed
          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      }
    }, 150);
  };

  document.addEventListener('focusin', handleFocus, true);
  
  return () => {
    document.removeEventListener('focusin', handleFocus, true);
  };
};

export default setupMobileInputFocusHandler;

