USE db_farmacia;

-- Receta ya ACEPTADA con fecha límite vencida — para probar el worker
-- de expiración sin esperar 3 días reales.
INSERT INTO recetas_recibidas
  (id_receta_farmacia, referencia_despacho, farmacia_codigo, medicamento, dosis, cantidad,
   estado, referencia_interna, fecha_recepcion, fecha_limite_retiro)
VALUES
  (UUID(), 'REC-TEST-EXPIRACION', 'FARM-001', 'Ibuprofeno 400mg', '1 tableta', 12,
   'ACEPTADA', 'REF-FARMA-TEST001', NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 1 DAY);
