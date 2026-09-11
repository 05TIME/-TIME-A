'use client';
import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('Payment received. TIMEŒ is confirming the transaction.');
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (reference) setStatus(`Payment reference ${reference} received. Confirmation is handled by Paystack webhook verification.`);
  }, []);
  return <main style={{padding:40,fontFamily:'system-ui',maxWidth:720,margin:'0 auto'}}><h1>TIMEŒ Payment</h1><p>{status}</p><a href="/">Return to TIMEŒ</a></main>;
}
