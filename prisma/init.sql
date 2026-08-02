CREATE DATABASE IF NOT EXISTS msgTrack;
USE msgTrack;

-- Technician table
CREATE TABLE IF NOT EXISTS Technician (
  id           INT          NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  zone         VARCHAR(10)  NOT NULL DEFAULT 'S',
  fieldWork    BOOLEAN      NOT NULL DEFAULT FALSE,
  status       VARCHAR(50)  NOT NULL DEFAULT 'Off Duty',
  workingToday BOOLEAN      NOT NULL DEFAULT FALSE,
  externalId   INT          NULL UNIQUE,
  syncedAt     DATETIME     NULL,
  createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Media table
CREATE TABLE IF NOT EXISTS Media (
  id            INT          NOT NULL AUTO_INCREMENT,
  technicianId  INT          NOT NULL,
  type          VARCHAR(20)  NOT NULL,
  filePath      VARCHAR(512) NOT NULL,
  fileName      VARCHAR(255) NOT NULL,
  displayOrder  INT          NOT NULL DEFAULT 0,
  createdAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_technicianId (technicianId),
  CONSTRAINT fk_media_technician FOREIGN KEY (technicianId) REFERENCES Technician(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timer table
CREATE TABLE IF NOT EXISTS Timer (
  id               INT      NOT NULL AUTO_INCREMENT,
  technicianId     INT      NOT NULL UNIQUE,
  remainingSeconds INT      NOT NULL DEFAULT 0,
  isRunning        BOOLEAN  NOT NULL DEFAULT FALSE,
  updatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_timer_technician FOREIGN KEY (technicianId) REFERENCES Technician(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin table
CREATE TABLE IF NOT EXISTS Admin (
  id       INT          NOT NULL AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
