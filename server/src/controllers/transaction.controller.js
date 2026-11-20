import { initiateTransaction, getTransactionStatus } from '../services/transaction.service.js';

export const initiate = async (req, res) => {
  const data = await initiateTransaction(req.body);
  res.status(201).json({ success: true, data });
};

export const getByReference = async (req, res) => {
  const data = await getTransactionStatus(req.params.reference);
  res.json({ success: true, data });
};
