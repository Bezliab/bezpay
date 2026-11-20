import { getBanks } from '../services/monnify/monnify.banks.js';
import { resolveRecipient } from '../services/transaction.service.js';

export const listBanks = async (req, res) => {
  res.json({ success: true, data: await getBanks() });
};

export const resolveAccount = async (req, res) => {
  const data = await resolveRecipient(req.body);
  res.json({ success: true, data });
};
