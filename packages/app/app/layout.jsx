import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './style.css';

export const metadata = {
  title: 'TIMEŒ OS - Command Center',
  description: 'Persistent commands · realtime execution telemetry · verification',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
