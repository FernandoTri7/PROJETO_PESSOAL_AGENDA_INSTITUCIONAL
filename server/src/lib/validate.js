// Middleware de validação de corpo de requisição com zod (RF-04 da spec de segurança).
// Em caso de erro, responde 400 com a lista de campos inválidos — nunca deixa virar 500.

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join('.') || '(body)',
        message: i.message,
      }));
      return res.status(400).json({ error: 'Dados inválidos', issues });
    }
    // Substitui o corpo pelos dados validados (chaves desconhecidas são descartadas).
    req.body = result.data;
    next();
  };
}
