const { z } = require('zod');

const noVacio = (campo) => z.string({ error: `${campo} es obligatorio` }).trim().min(1, `${campo} es obligatorio`);

// POST /api/v2/farmacia/recepcionar-receta
const recepcionarRecetaSchema = z.object({
  referenciaDespacho: noVacio('referenciaDespacho'),
  idEncuentroClinico: z.string().trim().min(1).optional().nullable(),
  farmacia: noVacio('farmacia'),
  medicamento: noVacio('medicamento'),
  dosis: noVacio('dosis'),
  cantidad: z.number({ error: 'cantidad es obligatoria y debe ser numérica' }).positive('cantidad debe ser mayor a 0'),
});

// PATCH /api/v2/farmacia/recetas/:id/rechazar
const rechazarManualSchema = z.object({
  motivo: z.string().trim().min(1).optional(),
});

module.exports = { recepcionarRecetaSchema, rechazarManualSchema };
