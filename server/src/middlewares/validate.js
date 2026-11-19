// TODO: Implement this module.
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const r = schema.safeParse(req[source]);
    if (!r.success) {
      return res.status(422).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: r.error.issues[0].message,
        errors: r.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req[source] = r.data;
    next();
  };
