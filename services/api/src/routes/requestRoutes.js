const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const liveLocationController = require('../controllers/liveLocationController');
const proposalController = require('../controllers/proposalController');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');

// Demandes d'assistance
router.post('/', authenticateToken, requestController.createRequest);
router.get('/', authenticateToken, requestController.getMyRequests);
router.get('/:id/live-location', authenticateToken, liveLocationController.getLiveLocations);
router.put('/:id/live-location', authenticateToken, liveLocationController.updateLiveLocation);
router.delete('/:id/live-location', authenticateToken, liveLocationController.stopLiveLocation);
router.get('/:id', authenticateToken, requestController.getRequestById);
router.post('/:id/media', authenticateToken, requestController.addRequestMedia);
router.delete('/:id/media/:mediaId', authenticateToken, requestController.deleteRequestMedia);
router.patch('/:id/status', authenticateToken, proposalController.updateRequestStatus);

// Propositions & Devis
router.post('/:id/proposals', authenticateToken, proposalController.createProposal);
router.post('/proposals/:proposalId/accept', authenticateToken, proposalController.acceptProposal);

// Messagerie instantanée (Chat)
router.get('/:id/messages', authenticateToken, messageController.getMessages);
router.post('/:id/messages', authenticateToken, messageController.sendMessage);

module.exports = router;
