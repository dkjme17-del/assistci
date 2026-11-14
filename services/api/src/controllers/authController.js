const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');
const { config } = require('../config/env');
const loginAttempts = require('../services/loginAttempts');
const authTokens = require('../services/authTokens');
const { sendMail } = require('../services/mailer');
const { sendSms } = require('../services/sms');
const logger = require('../config/logger');

const JWT_EXPIRES_IN = config.jwtExpiresIn;

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function requestMeta(req) {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
}

async function issueSession(user, req) {
  const token = signAccessToken(user);
  const refresh_token = await authTokens.createRefreshToken(user.id, requestMeta(req));
  return { token, refresh_token };
}

async function sendVerificationEmail(user) {
  const token = await authTokens.createEmailVerificationToken(user.id);
  const link = `${config.appUrl}/verify-email?token=${token}`;

  await sendMail({
    to: user.email,
    subject: 'Vérifiez votre adresse email — ASSISTCI',
    text: `Bonjour ${user.first_name},\n\nConfirmez votre adresse email en ouvrant ce lien : ${link}\n\nCe lien expire dans 24 heures.`,
    html: `<p>Bonjour ${user.first_name},</p><p>Confirmez votre adresse email en cliquant sur le lien suivant :</p><p><a href="${link}">Vérifier mon email</a></p><p>Ce lien expire dans 24 heures.</p>`,
  });
}

async function register(req, res) {
  try {
    const { first_name, last_name, email, phone, password, role = 'client', business_name, city, district, latitude, longitude } = req.body;

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
      const providerResult = await db.query(
        `INSERT INTO service_providers (user_id, business_name)
         VALUES ($1, $2)
         RETURNING id`,
        [newUser.id, business_name || `${first_name} ${last_name}`]
      );

      const providerId = providerResult.rows[0].id;
      const lat = latitude != null ? Number(latitude) : null;
      const lng = longitude != null ? Number(longitude) : null;
      const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
      const areaCity = (city ? String(city).trim() : '') || 'Abidjan';
      const areaDistrict = district ? String(district).trim() : null;

      // Enregistre la position partagée à l'inscription pour afficher le prestataire sur la carte
      if (hasCoordinates || areaDistrict) {
        try {
          await db.query(
            `INSERT INTO service_areas (provider_id, city, district, latitude, longitude, radius_km)
             VALUES ($1, $2, $3, $4, $5, 10)`,
            [providerId, areaCity, areaDistrict, hasCoordinates ? lat : null, hasCoordinates ? lng : null]
          );
        } catch (areaError) {
          logger.warn(
            { err: areaError, userId: newUser.id },
            "Enregistrement de la zone d'intervention impossible"
          );
        }
      }
    }

    // Envoi de l'email de vérification (ne bloque pas l'inscription)
    try {
      await sendVerificationEmail(newUser);
    } catch (mailError) {
      logger.warn({ err: mailError, userId: newUser.id }, 'Envoi email de vérification impossible');
    }

    const session = await issueSession(newUser, req);

    return res.status(201).json({
      message: 'Compte créé avec succès',
      token: session.token,
      refresh_token: session.refresh_token,
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

    const lockSeconds = loginAttempts.getLockSeconds(trimmedLogin);
    if (lockSeconds > 0) {
      res.setHeader('Retry-After', String(lockSeconds));
      return res.status(429).json({
        error: 'Compte temporairement verrouillé',
        message: `Trop de tentatives échouées. Réessayez dans ${Math.ceil(lockSeconds / 60)} minute(s).`,
        retry_after: lockSeconds,
      });
    }

    // Recherche de l'utilisateur par email ou téléphone
    const userResult = await db.query(
      `SELECT id, first_name, last_name, email, phone, password_hash, role, verification_status, is_active
       FROM users
       WHERE email = $1 OR phone = $2`,
      [trimmedLogin, login.trim()]
    );

    if (userResult.rows.length === 0) {
      loginAttempts.recordFailure(trimmedLogin);
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
      loginAttempts.recordFailure(trimmedLogin);
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email, téléphone ou mot de passe incorrect',
      });
    }

    loginAttempts.clearFailures(trimmedLogin);

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

    const session = await issueSession(user, req);

    delete user.password_hash;

    return res.json({
      message: 'Connexion réussie',
      token: session.token,
      refresh_token: session.refresh_token,
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
      `SELECT id, first_name, last_name, email, phone, role, verification_status,
              email_verified, phone_verified, mfa_enabled, avatar_url, created_at
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
       SET first_name = $1,
           last_name = $2,
           phone = $3,
           avatar_url = $4,
           phone_verified = CASE WHEN phone IS DISTINCT FROM $3 THEN false ELSE phone_verified END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, role, verification_status,
                 email_verified, phone_verified, mfa_enabled, avatar_url, created_at`,
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

    const userRes = await db.query(
      'SELECT id, email, role, password_hash FROM users WHERE id = $1',
      [userId]
    );
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

    await authTokens.revokeAllUserTokens(userId);

    const session = await issueSession(userRes.rows[0], req);

    return res.json({
      message: 'Mot de passe modifié avec succès',
      token: session.token,
      refresh_token: session.refresh_token,
    });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function forgotPassword(req, res) {
  try {
    const email = req.body.email.toLowerCase().trim();
    const userRes = await db.query(
      'SELECT id, first_name, email, is_active FROM users WHERE email = $1',
      [email]
    );
    const user = userRes.rows[0];

    if (user && user.is_active) {
      try {
        const token = await authTokens.createPasswordResetToken(user.id);
        const link = `${config.appUrl}/reset-password?token=${token}`;

        await sendMail({
          to: user.email,
          subject: 'Réinitialisation de votre mot de passe — ASSISTCI',
          text: `Bonjour ${user.first_name},\n\nPour réinitialiser votre mot de passe, ouvrez ce lien : ${link}\n\nCe lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
          html: `<p>Bonjour ${user.first_name},</p><p>Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
        });
      } catch (mailError) {
        logger.warn({ err: mailError, userId: user.id }, 'Envoi email de réinitialisation impossible');
      }
    }

    // Réponse générique : ne révèle pas l'existence du compte.
    return res.json({
      message:
        'Si un compte correspond à cette adresse, un email de réinitialisation a été envoyé.',
    });
  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    const userId = await authTokens.consumeEmailToken('password_reset', token);

    if (!userId) {
      return res.status(400).json({
        error: 'Jeton invalide',
        message: 'Ce lien de réinitialisation est invalide ou expiré',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const updated = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [password_hash, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(400).json({ error: 'Jeton invalide', message: 'Compte introuvable' });
    }

    await authTokens.revokeAllUserTokens(userId);

    return res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur resetPassword:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function verifyEmail(req, res) {
  try {
    const userId = await authTokens.consumeEmailToken('email_verification', req.body.token);

    if (!userId) {
      return res.status(400).json({
        error: 'Jeton invalide',
        message: 'Ce lien de vérification est invalide ou expiré',
      });
    }

    await db.query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    return res.json({ message: 'Adresse email vérifiée avec succès' });
  } catch (error) {
    console.error('Erreur verifyEmail:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function resendVerification(req, res) {
  try {
    const userRes = await db.query(
      'SELECT id, first_name, email, email_verified FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Déjà vérifié', message: 'Votre email est déjà vérifié' });
    }

    try {
      await sendVerificationEmail(user);
    } catch (mailError) {
      logger.warn({ err: mailError, userId: user.id }, 'Renvoi email de vérification impossible');
      return res.status(502).json({
        error: 'Envoi impossible',
        message: 'Impossible d’envoyer l’email de vérification pour le moment',
      });
    }

    return res.json({ message: 'Email de vérification envoyé' });
  } catch (error) {
    console.error('Erreur resendVerification:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function requestPhoneOtp(req, res) {
  try {
    const userRes = await db.query(
      'SELECT id, phone, phone_verified FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.phone_verified) {
      return res.status(400).json({
        error: 'Déjà vérifié',
        message: 'Votre numéro de téléphone est déjà vérifié',
      });
    }

    const code = await authTokens.createPhoneOtp(user.id);

    try {
      await sendSms({
        to: user.phone,
        message: `ASSISTCI : votre code de vérification est ${code}. Il expire dans 10 minutes.`,
      });
    } catch (smsError) {
      logger.warn({ err: smsError, userId: user.id }, 'Envoi du code SMS impossible');
      return res.status(502).json({
        error: 'Envoi impossible',
        message: 'Impossible d’envoyer le code SMS pour le moment',
      });
    }

    return res.json({ message: 'Code de vérification envoyé par SMS' });
  } catch (error) {
    console.error('Erreur requestPhoneOtp:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function verifyPhoneOtp(req, res) {
  try {
    const result = await authTokens.verifyPhoneOtp(req.user.userId, req.body.code);

    if (!result.ok) {
      const messages = {
        expired: 'Aucun code valide. Demandez un nouveau code.',
        too_many_attempts: 'Trop de tentatives. Demandez un nouveau code.',
        invalid: 'Code incorrect',
      };
      return res.status(400).json({
        error: 'Code invalide',
        message: messages[result.reason] || 'Code incorrect',
      });
    }

    await db.query(
      'UPDATE users SET phone_verified = true, updated_at = NOW() WHERE id = $1',
      [req.user.userId]
    );

    return res.json({ message: 'Numéro de téléphone vérifié avec succès' });
  } catch (error) {
    console.error('Erreur verifyPhoneOtp:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function refresh(req, res) {
  try {
    const rotated = await authTokens.rotateRefreshToken(req.body.refresh_token, requestMeta(req));

    if (!rotated) {
      return res.status(401).json({
        error: 'Session expirée',
        message: 'Votre session a expiré, veuillez vous reconnecter',
      });
    }

    const userRes = await db.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [rotated.userId]
    );
    const user = userRes.rows[0];

    if (!user || !user.is_active) {
      await authTokens.revokeAllUserTokens(rotated.userId);
      return res.status(401).json({
        error: 'Session expirée',
        message: 'Votre session a expiré, veuillez vous reconnecter',
      });
    }

    return res.json({
      token: signAccessToken(user),
      refresh_token: rotated.token,
    });
  } catch (error) {
    console.error('Erreur refresh:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function logout(req, res) {
  try {
    const { refresh_token, all } = req.body || {};

    if (all || !refresh_token) {
      await authTokens.revokeAllUserTokens(req.user.userId);
    } else {
      await authTokens.revokeRefreshToken(refresh_token);
    }

    return res.json({ message: 'Déconnexion effectuée' });
  } catch (error) {
    console.error('Erreur logout:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  requestPhoneOtp,
  verifyPhoneOtp,
  refresh,
  logout,
};

