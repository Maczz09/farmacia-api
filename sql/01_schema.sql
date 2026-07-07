CREATE DATABASE IF NOT EXISTS db_farmacia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_farmacia;

CREATE TABLE IF NOT EXISTS recetas_recibidas (
  id_receta_farmacia      VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  referencia_despacho     VARCHAR(100) NOT NULL,
  id_encuentro_clinico    VARCHAR(100) NULL,
  farmacia_codigo         VARCHAR(50)  NOT NULL,
  medicamento             VARCHAR(200) NOT NULL,
  dosis                   VARCHAR(100) NOT NULL,
  cantidad                INT          NOT NULL,
  estado                  ENUM('ACEPTADA','RECHAZADA_SIN_STOCK','RETIRADA_CONFIRMADA','NO_RETIRADA_FARMACIA')
                           NOT NULL,
  referencia_interna       VARCHAR(100) NULL,
  motivo_rechazo           VARCHAR(255) NULL,
  fecha_recepcion          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_limite_retiro      DATETIME     NULL,
  fecha_retiro_confirmado  TIMESTAMP    NULL,

  PRIMARY KEY (id_receta_farmacia),
  UNIQUE KEY uq_referencia_despacho (referencia_despacho),
  INDEX idx_estado_limite (estado, fecha_limite_retiro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Outbox local de webhooks salientes hacia MediCitas ────────────────────────
-- Si la entrega inmediata (con reintento en memoria) falla, el evento se
-- persiste aquí para que un worker en background siga reintentando con
-- backoff hasta que MediCitas vuelva a estar disponible — sin esto, un
-- webhook fallido se pierde para siempre y los dos sistemas quedan
-- desincronizados (ej. receta RETIRADA en farmacia pero Pendiente en MediCitas).
CREATE TABLE IF NOT EXISTS webhooks_salientes (
  id                  VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  tipo_evento         VARCHAR(60)  NOT NULL,
  payload             JSON         NOT NULL,
  url_destino         VARCHAR(255) NOT NULL,
  estado              ENUM('PENDIENTE','ENTREGADO','FALLIDO_PERMANENTE') NOT NULL DEFAULT 'PENDIENTE',
  intentos            INT          NOT NULL DEFAULT 0,
  proximo_intento_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_error        VARCHAR(500) NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_estado_proximo (estado, proximo_intento_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
