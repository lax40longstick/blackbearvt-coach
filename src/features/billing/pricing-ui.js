import { startCheckout } from "./checkout.js";

export function bootPricingPage() {
  const billingToggle = document.querySelector("[data-billing-toggle]");
  const getInterval = () => (billingToggle?.checked ? "year" : "month");

  // Update displayed prices when the annual toggle flips.
  const updatePrices = () => {
    const annual = billingToggle?.checked;
    document.querySelectorAll("[data-price-monthly]").forEach((el) => {
      const monthly = el.getAttribute("data-price-monthly");
      const yearly = el.getAttribute("data-price-yearly");
      if (annual && yearly) el.textContent = yearly;
      else if (monthly) el.textContent = monthly;
    });
  };
  if (billingToggle) {
    billingToggle.addEventListener("change", updatePrices);
    updatePrices();
  }

  document.querySelectorAll("[data-checkout-plan]").forEach((button) => {
    button.addEventListener("click", async () => {
      const plan = button.dataset.checkoutPlan || "starter";
      button.disabled = true;
      try {
        await startCheckout(plan, { source: "pricing", interval: getInterval() });
      } finally {
        button.disabled = false;
      }
    });
  });
}
