export const FLOW = ['PENDING_INFLOW', 'INFLOW_CONFIRMED', 'PAYOUT_PROCESSING', 'COMPLETED'];
export const TERMINAL = ['COMPLETED', 'FAILED', 'UNDERPAID']; // EXPIRED is handled separately in the poller

export const STEPS = [
  { title: 'Awaiting your transfer', done: 'Transfer received' },
  { title: 'Confirming payment', done: 'Payment confirmed' },
  { title: 'Sending to recipient', done: 'Sent to recipient' },
  { title: 'Complete', done: 'Delivered' },
];
