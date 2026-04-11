/**
 * @file validate.js
 * @description Zod request-body validation middleware factory.
 *
 * Usage in a route file:
 *   import { validate } from "../middleware/validate.js";
 *   import { loginSchema } from "../schemas/auth.schema.js";
 *
 *   router.post("/login", validate(loginSchema), loginController);
 *
 * On a schema mismatch the request is rejected with 400 before the
 * controller ever runs. On success, `req.body` is replaced with the
 * typed, coerced output from Zod (strips unknown keys, applies defaults).
 */

/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 *
 * @param {import("zod").ZodTypeAny} schema - The Zod schema to validate against.
 * @returns {import("express").RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field:   i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ message: "Validation failed", errors });
    }

    req.body = result.data; // replace with parsed + coerced values
    next();
  };
}
