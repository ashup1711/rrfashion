/**
 * Dynamically load the Razorpay checkout.js script.
 * Returns a promise that resolves once the script is loaded.
 * Rejects with an error if the script fails to load or times out after 10 seconds.
 */
export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error('Failed to load Razorpay checkout script'));
    };

    // Add 10-second timeout so the promise doesn't hang indefinitely
    timeoutId = setTimeout(() => {
      // Clean up the script element if it was added but never loaded
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error('Razorpay checkout script timed out after 10 seconds'));
    }, 10000);

    document.body.appendChild(script);
  });
}
