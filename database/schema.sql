-- =============================================================================
-- ASSISTCI - Schéma de base de données PostgreSQL
-- Plateforme d'assistance et services de proximité (Abidjan, Côte d'Ivoire)
-- =============================================================================

-- 1. EXTENSIONS (Optionnel si disponible : uuid-ossp, postgis)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. UTILISATEURS & AUTHENTIFICATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'provider', 'admin', 'moderator')),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- 3. VÉRIFICATION D'IDENTITÉ & CONFIANCE (KYC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kyc_documents (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('cni', 'passport', 'selfie', 'trade_register', 'driving_license', 'other')),
  document_url VARCHAR(500) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_documents(status);

-- =============================================================================
-- 4. CATÉGORIES DE SERVICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. PROFILS PRESTATAIRES & ZONES DE COUVERTURE
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_providers (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  bio TEXT,
  logo_url VARCHAR(500),
  specialties TEXT[], -- ex: ARRAY['mecanique', 'remorquage', 'electricite_auto']
  rating NUMERIC(3,2) DEFAULT 0.0 CHECK (rating BETWEEN 0 AND 5),
  total_reviews INT NOT NULL DEFAULT 0,
  completed_missions INT NOT NULL DEFAULT 0,
  availability BOOLEAN NOT NULL DEFAULT true,
  emergency_ready BOOLEAN NOT NULL DEFAULT false, -- prêt pour assistance immédiate
  hourly_rate NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_rating ON service_providers(rating);
CREATE INDEX IF NOT EXISTS idx_providers_avail ON service_providers(availability);

-- Galerie de réalisations du prestataire
CREATE TABLE IF NOT EXISTS provider_photos (
  id SERIAL PRIMARY KEY,
  provider_id INT NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_photos_provider ON provider_photos(provider_id);

CREATE TABLE IF NOT EXISTS service_areas (
  id SERIAL PRIMARY KEY,
  provider_id INT NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  city VARCHAR(100) NOT NULL DEFAULT 'Abidjan',
  district VARCHAR(100), -- Cocody, Yopougon, Marcory, Plateau, etc.
  covered_highways TEXT[], -- ARRAY['Autoroute du Nord', 'La Côtière']
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  radius_km NUMERIC(5,2) DEFAULT 10.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_areas_provider ON service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_areas_coords ON service_areas(latitude, longitude);

-- =============================================================================
-- 6. DEMANDES D'ASSISTANCE & INTERVENTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES service_categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  breakdown_type VARCHAR(50) CHECK (breakdown_type IN ('battery', 'flat_tire', 'towing', 'engine_failure', 'fuel', 'lockout', 'other')),
  vehicle_type VARCHAR(50), -- citadine, suv, camion, moto
  vehicle_brand VARCHAR(100), -- Toyota, Hyundai, Peugeot, etc.
  address_text VARCHAR(255),
  location_type VARCHAR(30) DEFAULT 'city' CHECK (location_type IN ('city', 'highway', 'rural')),
  highway_axis VARCHAR(100), -- Autoroute du Nord (A3), La Côtière (A10), etc.
  highway_milestone VARCHAR(100), -- PK 145, Près du péage de Singrobo, etc.
  city VARCHAR(100) NOT NULL DEFAULT 'Abidjan',
  district VARCHAR(100),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  urgency VARCHAR(30) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(30) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'matching', 'proposal_received', 'accepted', 'in_progress', 'completed', 'cancelled')),
  assigned_provider_id INT REFERENCES service_providers(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_coords ON service_requests(latitude, longitude);

-- Photos et médias liés à la panne
CREATE TABLE IF NOT EXISTS request_media (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  media_url VARCHAR(500) NOT NULL,
  media_type VARCHAR(30) NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Devis et propositions faites par les prestataires
CREATE TABLE IF NOT EXISTS request_proposals (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id INT NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  proposed_price NUMERIC(10,2) NOT NULL,
  estimated_arrival_minutes INT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_request ON request_proposals(request_id);
CREATE INDEX IF NOT EXISTS idx_proposals_provider ON request_proposals(provider_id);

-- =============================================================================
-- 7. MESSAGERIE INSTANTANÉE (CHAT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- =============================================================================
-- 8. PAIEMENTS & TRANSACTIONS (Mobile Money)
-- =============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  client_id INT NOT NULL REFERENCES users(id),
  provider_id INT NOT NULL REFERENCES service_providers(id),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('wave', 'orange_money', 'mtn_momo', 'moov_money', 'cash', 'card')),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_reference VARCHAR(255) UNIQUE,
  external_transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_request ON transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(payment_status);

-- =============================================================================
-- 9. AVIS & RÉPUTATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  request_id INT UNIQUE NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  client_id INT NOT NULL REFERENCES users(id),
  provider_id INT NOT NULL REFERENCES service_providers(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  punctuality_rating INT CHECK (punctuality_rating BETWEEN 1 AND 5),
  quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),
  is_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);

-- =============================================================================
-- 10. NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'request_created', 'proposal_received', 'status_changed', etc.
  link VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- =============================================================================
-- 11. AUDIT & LOGS D'ADMINISTRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INT NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_entity VARCHAR(50) NOT NULL,
  target_id INT NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. DONNÉES INITIALES (SEEDING DE BASE)
-- =============================================================================

INSERT INTO service_categories (name, slug, description, icon_name)
VALUES
  ('Assistance Automobile', 'auto', 'Dépannage, remorquage, mécanique d urgence, batterie et crevaison à Abidjan', 'car'),
  ('Plomberie', 'plomberie', 'Réparation de fuites, débouchage et dépannage plomberie', 'droplets'),
  ('Électricité', 'electricite', 'Court-circuit, installation et dépannage électrique', 'zap'),
  ('Climatisation & Froid', 'climatisation', 'Installation, entretien et réparation de climatiseurs et frigos', 'snowflake'),
  ('Ménage & Nettoyage', 'menage', 'Nettoyage de maison, bureaux et remise en état', 'sparkles'),
  ('Jardinage & Espaces verts', 'jardinage', 'Tonte, élagage, entretien de jardins et espaces verts', 'trees'),
  ('Bricolage & Petits travaux', 'bricolage', 'Montage de meubles, fixations, petites réparations', 'hammer'),
  ('Peinture & Rénovation', 'peinture', 'Peinture intérieure/extérieure et travaux de finition', 'paint-roller'),
  ('Menuiserie & Serrurerie', 'menuiserie', 'Portes, fenêtres, serrures et réparations bois', 'door-open'),
  ('Déménagement & Manutention', 'demenagement', 'Transport de meubles, chargement et manutention', 'truck'),
  ('Informatique & Réseaux', 'informatique', 'Réparation d’ordinateurs, installation et dépannage réseau', 'laptop'),
  ('Électroménager', 'electromenager', 'Réparation de machines à laver, réfrigérateurs et appareils', 'washing-machine'),
  ('Sécurité & Gardiennage', 'securite', 'Installation de caméras, alarmes et services de sécurité', 'shield'),
  ('Beauté & Bien-être', 'beaute', 'Coiffure, esthétique et soins à domicile', 'scissors'),
  ('Cours & Soutien scolaire', 'cours', 'Cours particuliers et soutien scolaire à domicile', 'graduation-cap')
ON CONFLICT (slug) DO NOTHING;

-- Compte administrateur par défaut (mot de passe : Admin123! — À CHANGER EN PRODUCTION)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, verification_status, is_active, email_verified, phone_verified)
VALUES (
  'Superviseur',
  'ASSISTCI',
  'admin@assistci.ci',
  '+2250100000000',
  '$2b$10$a2SeqM9NGlkMdw8kak9BO.F7wq8bKOtuOTU66oZa./JJk9LkL7yiO',
  'admin',
  'verified',
  true,
  true,
  true
)
ON CONFLICT (email) DO NOTHING;
