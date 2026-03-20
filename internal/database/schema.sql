-- ============================================================
-- proyectoBar - Schema MySQL
-- Versión: 1.0
-- Sedes: Galerías, Restrepo, Zona T
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ------------------------------------------------------------
-- Base de datos
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS proyectobar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE proyectobar;

-- ============================================================
-- SEDES
-- ============================================================
CREATE TABLE sedes (
  id        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100)    NOT NULL,
  direccion VARCHAR(255)    NOT NULL,
  activa    TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sede_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sedes iniciales
INSERT INTO sedes (nombre, direccion) VALUES
  ('Galerías',  'Dirección Galerías'),
  ('Restrepo',  'Dirección Restrepo'),
  ('Zona T',    'Dirección Zona T');

-- ============================================================
-- USUARIOS
-- sede_id NULL = administrador (acceso a todas las sedes)
-- ============================================================
CREATE TABLE usuarios (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  sede_id       INT UNSIGNED    NULL,
  nombre        VARCHAR(150)    NOT NULL,
  email         VARCHAR(150)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  rol           ENUM('admin','cajero','mesero') NOT NULL,
  activo        TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email),
  CONSTRAINT fk_usuario_sede
    FOREIGN KEY (sede_id) REFERENCES sedes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIAS (maestro global, creado por admin)
-- ============================================================
CREATE TABLE categorias (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)  NOT NULL,
  descripcion TEXT          NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categoria_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCTOS (maestro global, precio centralizado)
-- ============================================================
CREATE TABLE productos (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  categoria_id INT UNSIGNED    NOT NULL,
  nombre       VARCHAR(150)    NOT NULL,
  descripcion  TEXT            NULL,
  precio       DECIMAL(10, 2)  NOT NULL,
  activo       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_producto_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INVENTARIO (stock independiente por sede)
-- ============================================================
CREATE TABLE inventario (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sede_id      INT UNSIGNED  NOT NULL,
  producto_id  INT UNSIGNED  NOT NULL,
  stock_actual INT           NOT NULL DEFAULT 0,
  stock_minimo INT           NOT NULL DEFAULT 0,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_sede_producto (sede_id, producto_id),
  CONSTRAINT fk_inv_sede
    FOREIGN KEY (sede_id) REFERENCES sedes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inv_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MOVIMIENTOS_INVENTARIO
-- tipo: entrada (cajero manual), descuento_venta (automático al pagar),
--       ajuste_manual (corrección de cajero)
-- ============================================================
CREATE TABLE movimientos_inventario (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  inventario_id INT UNSIGNED  NOT NULL,
  usuario_id    INT UNSIGNED  NOT NULL,
  tipo          ENUM('entrada','descuento_venta','ajuste_manual') NOT NULL,
  cantidad      INT           NOT NULL,
  motivo        TEXT          NULL,
  fecha         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_mov_inventario
    FOREIGN KEY (inventario_id) REFERENCES inventario (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_mov_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PEDIDOS
-- estado: abierto (mesero crea/edita), pagado (cajero cierra)
-- ============================================================
CREATE TABLE pedidos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sede_id     INT UNSIGNED  NOT NULL,
  usuario_id  INT UNSIGNED  NOT NULL,
  estado      ENUM('abierto','pagado') NOT NULL DEFAULT 'abierto',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_at  TIMESTAMP     NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_pedido_sede
    FOREIGN KEY (sede_id) REFERENCES sedes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pedido_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PEDIDO_DETALLE
-- precio_unitario se guarda al momento del pedido (snapshot)
-- ============================================================
CREATE TABLE pedido_detalle (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  pedido_id       INT UNSIGNED    NOT NULL,
  producto_id     INT UNSIGNED    NOT NULL,
  cantidad        INT             NOT NULL,
  precio_unitario DECIMAL(10, 2)  NOT NULL,
  notas           TEXT            NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_det_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_det_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAGOS
-- Se crea cuando el cajero pasa el pedido a "pagado"
-- ============================================================
CREATE TABLE pagos (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  pedido_id    INT UNSIGNED    NOT NULL,
  usuario_id   INT UNSIGNED    NOT NULL,
  total        DECIMAL(10, 2)  NOT NULL,
  metodo_pago  ENUM('efectivo','tarjeta_credito','tarjeta_debito') NOT NULL,
  fecha        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pago_pedido (pedido_id),
  CONSTRAINT fk_pago_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pago_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INDICES ADICIONALES para consultas frecuentes
-- ============================================================
CREATE INDEX idx_pedidos_sede_estado   ON pedidos (sede_id, estado);
CREATE INDEX idx_pedidos_fecha         ON pedidos (created_at);
CREATE INDEX idx_inv_stock_minimo      ON inventario (sede_id, stock_actual, stock_minimo);
CREATE INDEX idx_mov_fecha             ON movimientos_inventario (fecha);
CREATE INDEX idx_pagos_fecha           ON pagos (fecha);
CREATE INDEX idx_usuarios_sede_rol     ON usuarios (sede_id, rol);

SET FOREIGN_KEY_CHECKS = 1;
