import CheckoutClient from "@/components/checkout/CheckoutClient";

export const metadata = {
  title: "Checkout — HUSH H1",
  description:
    "Complete your order for the HUSH H1, a premium adaptive noise cancelling over-ear headphone.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}