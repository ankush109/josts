import * as FormulaConfigService from "../services/formula-config.service.js";

export const getList = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.listFormulaConfigs();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getActive = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.getActiveFormulaConfig();
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.getFormulaConfigById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.createFormulaConfig(req.body, req.user?.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.updateFormulaConfig(
      req.params.id,
      req.body,
      req.user?.userId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const activate = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.activateFormulaConfig(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const test = async (req, res, next) => {
  try {
    const data = await FormulaConfigService.testFormulaConfig(
      req.params.id,
      req.body ?? {},
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteConfig = async (req, res, next) => {
  try {
    await FormulaConfigService.deleteFormulaConfig(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
