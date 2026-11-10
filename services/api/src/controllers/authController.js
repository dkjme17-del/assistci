const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');
const { config } = require('../config/env');

const JWT_EXPIRES_IN = config.jwtExpiresIn;

async function register(req, res) {
  try {
    const { first_name, last_name, email, phone, password, role = 'client', business_name } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'Validation échouée',
        message: 'Tous les champs obligatoires doivent être renseignés (prénom, nom, email, téléphone, mot de passe)',
      });
    }

    const normalizedRole = ['client', 'provider'].includes(role) ? role : 'client';

    // Vérifier si l'utilisateur existe déjà
    const existing = await db.query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [email.toLowerCase().trim(), phone.trim()]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      const field = match.email === email.toLowerCase().trim() ? 'email' : 'téléphone';
      return res.status(409).json({
        error: 'Conflit',
        message: `Un compte avec ce numéro de ${field} existe déjà`,
      });
    }

    // Hachage du mot de passe
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insertion de l'utilisateur
    const userResult = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, phone, role, verification_status, created_at`,
      [first_name.trim(), last_name.trim(), email.toLowerCase().trim(), phone.trim(), password_hash, normalizedRole]
    );

    const newUser = userResult.rows[0];

    // Si c'est un prestataire, créer son profil prestataire associé
    if (normalizedRole === 'provider') {
      await db.query(
        `INSERT INTO service_providers (user_id, business_name)
         VALUES ($1, $2)`,
        [newUser.id, business_name || `${first_name} ${last_name}`]
      );
    }

    // Génération du token JWT
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message || 'Impossible de finaliser l’inscription',
    });
  }
}

async function login(req, res) {
  try {
    const { login, password } = req.body; // login peut être email ou téléphone

    if (!login || !password) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'L’identifiant (email ou téléphone) et le mot de passe sont requis',
      });
    }

    const trimmedLogin = login.trim().toLowerCase();

    // Recherche de l'utilisateur par email ou téléphone
    const userResult = await db.query(
      `SELECT id, first_name, last_name, email, phone, password_hash, role, verification_status, is_active
       FROM users
       WHERE email = $1 OR phone = $2`,
      [trimmedLogin, login.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email, téléphone ou mot de passe incorrect',
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Compte désactivé',
        message: 'Votre compte a été désactivé. Veuillez contacter le support.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email, téléphone ou mot de passe incorrect',
      });
    }

    // Récupérer les infos prestataire si applicable
    let providerProfile = null;
    if (user.role === 'provider') {
      const providerRes = await db.query(
        'SELECT id, business_name, rating, availability, emergency_ready FROM service_providers WHERE user_id = $1',
        [user.id]
      );
      if (providerRes.rows.length > 0) {
        providerProfile = providerRes.rows[0];
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    delete user.password_hash;

    return res.json({
      message: 'Connexion réussie',
      token,
      user,
      provider: providerProfile,
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message || 'Impossible de se connecter',
    });
  }
}

async function getMe(req, res) {
  try {
    const userResult = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, verification_status, avatar_url, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];
    let provider = null;

    if (user.role === 'provider') {
      const providerRes = await db.query(
        'SELECT * FROM service_providers WHERE user_id = $1',
        [user.id]
      );
      provider = providerRes.rows[0] || null;
    }

    return res.json({ user, provider });
  } catch (error) {
    console.error('Erreur getMe:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateMe(req, res) {
  try {
    const userId = req.user.userId;
    const { first_name, last_name, phone, avatar_url } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'Le prénom, le nom et le téléphone sont obligatoires',
      });
    }

    // Unicité du téléphone (hors utilisateur courant)
    const conflict = await db.query(
      'SELECT id FROM users WHERE phone = $1 AND id <> $2',
      [phone.trim(), userId]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflit',
        message: 'Ce numéro de téléphone est déjà utilisé par un autre compte',
      });
    }

    const result = await db.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, phone = $3, avatar_url = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, role, verification_status, avatar_url, created_at`,
      [
        first_name.trim(),
        last_name.trim(),
        phone.trim(),
        avatar_url || null,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    return res.json({ message: 'Profil mis à jour', user: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateMe:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: 'Mot de passe trop court',
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
      });
    }

    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Mot de passe incorrect',
        message: 'Le mot de passe actuel est incorrect',
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      password_hash,
      userId,
    ]);

    return res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
};

