const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const liveLocationController = require('../controllers/liveLocationController');
const proposalController = require('../controllers/proposalController');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const schemas = require('../validators/schemas');
const {
  messageLimiter,
  requestCreateLimiter,
  proposalLimiter,
} = require('../middlewares/rateLimit');

// Demandes d'assistance
router.post(
  '/',
  authenticateToken,
  requestCreateLimiter,
  validate(schemas.createRequestSchema),
  requestController.createRequest
);
router.get('/', authenticateToken, requestController.getMyRequests);
router.get('/:id', authenticateToken, validate(schemas.idParam, 'params'), requestController.getRequestById);
router.get(
  '/:id/live-location',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  liveLocationController.getLiveLocations
);
router.put(
  '/:id/live-location',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  validate(schemas.liveLocationSchema),
  liveLocationController.updateLiveLocation
);
router.delete(
  '/:id/live-location',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  liveLocationController.stopLiveLocation
);
router.post(
  '/:id/media',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  validate(schemas.requestMediaSchema),
  requestController.addRequestMedia
);
router.delete(
  '/:id/media/:mediaId',
  authenticateToken,
  validate(schemas.idAndMediaParam, 'params'),
  requestController.deleteRequestMedia
);
router.patch(
  '/:id/status',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  validate(schemas.updateRequestStatusSchema),
  proposalController.updateRequestStatus
);

// Propositions & Devis
router.post(
  '/:id/proposals',
  authenticateToken,
  proposalLimiter,
  validate(schemas.idParam, 'params'),
  validate(schemas.createProposalSchema),
  proposalController.createProposal
);
router.post(
  '/proposals/:proposalId/accept',
  authenticateToken,
  validate(schemas.proposalParam, 'params'),
  proposalController.acceptProposal
);

// Messagerie instantanée (Chat)
router.get(
  '/:id/messages',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  messageController.getMessages
);
router.post(
  '/:id/messages',
  authenticateToken,
  messageLimiter,
  validate(schemas.idParam, 'params'),
  validate(schemas.messageSchema),
  messageController.sendMessage
);
router.patch(
  '/:id/messages/read',
  authenticateToken,
  validate(schemas.idParam, 'params'),
  messageController.markMessagesRead
);

module.exports = router;
