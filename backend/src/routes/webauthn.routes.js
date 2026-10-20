const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
} = require('../controllers/webauthn.controller');

const router = Router();

// All WebAuthn actions require user authentication
router.use(requireAuth);

router.post('/register/options', getRegistrationOptions);
router.post('/register/verify', verifyRegistration);
router.post('/auth/options', getAuthenticationOptions);
router.post('/auth/verify', verifyAuthentication);

module.exports = router;
