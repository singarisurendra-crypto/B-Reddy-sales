import "./globals.css";

export const metadata = {
  title: "B Reddy Sales",
  description: "Retail Sales Management"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
