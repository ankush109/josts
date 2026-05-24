import * as TemplateService from "../services/template.service.js";

export const listTemplates = async (req, res, next) => {
  try {
    const data = await TemplateService.listTemplates();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTemplate = async (req, res, next) => {
  try {
    const data = await TemplateService.getTemplate(req.params.key);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getVersion = async (req, res, next) => {
  try {
    const data = await TemplateService.getVersion(req.params.key, req.params.versionId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getActiveVersion = async (req, res, next) => {
  try {
    const data = await TemplateService.getActiveVersion(req.params.key);
    if (!data) return res.status(404).json({ success: false, message: "No active version" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createVersion = async (req, res, next) => {
  try {
    const data = await TemplateService.createVersion(
      req.params.key,
      { body: req.body?.body, note: req.body?.note, activate: req.body?.activate ?? true },
      req.user?.userId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const activateVersion = async (req, res, next) => {
  try {
    const data = await TemplateService.activateVersion(req.params.key, req.body?.versionId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSampleData = async (req, res, next) => {
  try {
    const { reportId } = req.query;
    if (!reportId) {
      return res.status(400).json({ success: false, message: "reportId query param required" });
    }
    const data = await TemplateService.buildSampleData(String(reportId));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
