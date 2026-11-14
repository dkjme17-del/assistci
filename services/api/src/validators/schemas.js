const { z } = require('zod');

const phone = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone trop court')
  .max(30, 'Numéro de téléphone trop long')
  .regex(/^[+]?[0-9 ().-]{6,30}$/, 'Numéro de téléphone invalide');

const password = z
  .string()
  .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
  .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères');

const name = z.string().trim().min(1, 'Champ obligatoire').max(100, '100 caractères maximum');

const idParam = z.object({
  id: z.coerce.number().int().positive('Identifiant invalide'),
});

const idAndMediaParam = z.object({
  id: z.coerce.number().int().positive('Identifiant invalide'),
  mediaId: z.coerce.number().int().positive('Identifiant de média invalide'),
});

const proposalParam = z.object({
  proposalId: z.coerce.number().int().positive('Identifiant de proposition invalide'),
});

const providerParam = z.object({
  providerId: z.coerce.number().int().positive('Identifiant de prestataire invalide'),
});

// --- Auth ---
const registerSchema = z
  .object({
    first_name: name,
    last_name: name,
    email: z.string().trim().toLowerCase().email('Adresse email invalide').max(255),
    phone,
    password,
    role: z.enum(['client', 'provider']).default('client'),
    business_name: z.string().trim().max(150).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    district: z.string().trim().max(100).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasLatitude = data.latitude != null;
    const hasLongitude = data.longitude != null;
    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'La latitude et la longitude doivent être fournies ensemble',
      });
    }
  });

const loginSchema = z.object({
  login: z.string().trim().min(3, 'Identifiant requis').max(255),
  password: z.string().min(1, 'Mot de passe requis').max(72),
});

const updateMeSchema = z.object({
  first_name: name,
  last_name: name,
  phone,
  avatar_url: z.string().trim().max(500).optional().nullable(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis').max(72),
  new_password: password,
});

const emailSchema = z.string().trim().toLowerCase().email('Adresse email invalide').max(255);

const tokenSchema = z.string().trim().min(20, 'Jeton invalide').max(200, 'Jeton invalide');

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: tokenSchema,
  password,
});

const verifyEmailSchema = z.object({
  token: tokenSchema,
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().trim().min(20, 'Jeton de session invalide').max(500),
});

const logoutSchema = z
  .object({
    refresh_token: z.string().trim().min(20).max(500).optional(),
    all: z.boolean().optional(),
  })
  .default({});

const verifyOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
});

// --- Demandes ---
const createRequestSchema = z.object({
  category_id: z.coerce.number().int().positive('Catégorie invalide'),
  title: z.string().trim().min(3, 'Titre trop court').max(255, 'Titre trop long'),
  description: z.string().trim().min(3, 'Description trop courte').max(5000, 'Description trop longue'),
  breakdown_type: z
    .enum(['battery', 'flat_tire', 'towing', 'engine_failure', 'fuel', 'lockout', 'other'])
    .optional(),
  vehicle_type: z.string().trim().max(50).optional().nullable(),
  vehicle_brand: z.string().trim().max(100).optional().nullable(),
  address_text: z.string().trim().max(255).optional().nullable(),
  location_type: z.enum(['city', 'highway', 'rural']).optional(),
  highway_axis: z.string().trim().max(100).optional().nullable(),
  highway_milestone: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  media: z
    .array(
      z.union([
        z.string().trim().min(1).max(500),
        z.object({
          url: z.string().trim().min(1).max(500),
          type: z.enum(['image', 'video']).optional(),
        }),
      ])
    )
    .max(8)
    .optional(),
  provider_id: z
    .preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().int().positive('Prestataire invalide').optional()
    ),
});

const updateRequestStatusSchema = z.object({
  status: z.enum(['accepted', 'in_progress', 'completed', 'cancelled']),
  cancellation_reason: z.string().trim().max(1000).optional().nullable(),
});

const requestMediaSchema = z.object({
  media_url: z.string().trim().min(1, 'URL du média requise').max(500),
  media_type: z.enum(['image', 'video']).optional(),
});

const liveLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

// --- Propositions ---
const createProposalSchema = z.object({
  proposed_price: z.coerce.number().positive('Le prix doit être supérieur à 0').max(100_000_000),
  estimated_arrival_minutes: z.coerce.number().int().positive().max(1440).optional(),
  message: z.string().trim().max(2000).optional(),
});

// --- Messages ---
const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message vide').max(2000, 'Message trop long'),
});

// --- Transactions ---
const createTransactionSchema = z.object({
  request_id: z.coerce.number().int().positive('Demande invalide'),
  amount: z.coerce.number().positive('Montant invalide').max(100_000_000),
  payment_method: z.enum(['wave', 'orange_money', 'mtn_momo', 'moov_money', 'cash', 'card']),
  transaction_reference: z.string().trim().max(255).optional().nullable(),
});

const updateTransactionStatusSchema = z.object({
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']),
});

// --- Avis ---
const createReviewSchema = z.object({
  request_id: z.coerce.number().int().positive('Demande invalide'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  punctuality_rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  quality_rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
});

// --- Admin ---
const reviewKycSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().trim().max(1000).optional().nullable(),
});

// --- KYC ---
const kycUploadSchema = z.object({
  document_type: z.enum(['cni', 'passport', 'selfie', 'trade_register', 'driving_license', 'other']),
  document_url: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .trim()
      .max(500)
      .url('Lien invalide')
      .refine((value) => value.startsWith('https://'), 'Le lien doit être en HTTPS')
      .optional()
  ),
});

// --- Prestataires ---
const updateProviderSchema = z.object({
  business_name: z.string().trim().max(150).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  hourly_rate: z
    .union([z.null(), z.coerce.number().min(0, 'Tarif invalide').max(10_000_000)])
    .optional(),
  availability: z.boolean().optional(),
  emergency_ready: z.boolean().optional(),
  logo_url: z.string().trim().max(500).optional().nullable(),
});

const providerAreasSchema = z.object({
  areas: z
    .array(
      z.object({
        city: z.string().trim().min(1).max(100).default('Abidjan'),
        district: z.string().trim().max(100).optional().nullable(),
        latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
        longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
        radius_km: z.coerce.number().positive().max(500).optional(),
      })
    )
    .min(1, 'Au moins une zone est requise')
    .max(10),
});

const providerPhotoSchema = z.object({
  photo_url: z.string().trim().min(1, 'URL de la photo requise').max(500),
  caption: z.string().trim().max(255).optional().nullable(),
});

// --- IA ---
const aiAnalyzeSchema = z.object({
  message: z.string().trim().min(3, 'Message trop court').max(5000),
  location: z.string().trim().max(100).optional().nullable(),
});

const aiRankSchema = z.object({
  request_district: z.string().trim().max(100).optional().nullable(),
  breakdown_type: z.string().trim().max(50).optional().nullable(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  providers: z.array(z.record(z.string(), z.any())).min(1, 'Liste de prestataires requise').max(100),
});

module.exports = {
  idParam,
  idAndMediaParam,
  proposalParam,
  providerParam,
  registerSchema,
  loginSchema,
  updateMeSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  logoutSchema,
  verifyOtpSchema,
  createRequestSchema,
  updateRequestStatusSchema,
  requestMediaSchema,
  liveLocationSchema,
  createProposalSchema,
  messageSchema,
  createTransactionSchema,
  updateTransactionStatusSchema,
  createReviewSchema,
  reviewKycSchema,
  kycUploadSchema,
  updateProviderSchema,
  providerAreasSchema,
  providerPhotoSchema,
  aiAnalyzeSchema,
  aiRankSchema,
};
