import * as InstrumentService from "../services/instrument.service.js";
import { getInstrumentAudit } from "../services/instrument-audit.service.js";

export const getInstrumentList = async (req, res, next) => {
  try {
    const result = await InstrumentService.listInstruments(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getInstrumentDetails = async (req, res, next) => {
  try {
    const data = await InstrumentService.getInstrumentById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createInstrument = async (req, res, next) => {
  try {
    const data = await InstrumentService.createInstrument(req.body, req.user?.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateInstrument = async (req, res, next) => {
  try {
    const data = await InstrumentService.updateInstrument(
      req.params.id,
      req.body,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setInstrumentActive = async (req, res, next) => {
  try {
    const data = await InstrumentService.setInstrumentActive(
      req.params.id,
      Boolean(req.body?.isActive),
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteInstrument = async (req, res, next) => {
  try {
    const data = await InstrumentService.deleteInstrument(
      req.params.id,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInstrumentHistory = async (req, res, next) => {
  try {
    const data = await getInstrumentAudit(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
