CREATE DATABASE IF NOT EXISTS db_farmacia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_farmacia;

CREATE TABLE IF NOT EXISTS recetas_recibidas (
  id_receta_farmacia      VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  referencia_despacho     VARCHAR(100) NOT NULL,
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
