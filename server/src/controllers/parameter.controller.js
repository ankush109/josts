import * as ParameterService from "../services/parameter.service.js";

export const getParameterList = async (req, res, next) => {
  try {
    const result = await ParameterService.listParameters(req.query);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

export const getParameter = async (req, res, next) => {
  try {
    const data = await ParameterService.getParameterById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createParameter = async (req, res, next) => {
  try {
    const data = await ParameterService.createParameter(req.body, req.user?.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateParameter = async (req, res, next) => {
  try {
    const data = await ParameterService.updateParameter(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const setParameterActive = async (req, res, next) => {
  try {
    const data = await ParameterService.setParameterActive(
      req.params.id,
      Boolean(req.body?.isActive),
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
