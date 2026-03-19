// ============================================
// middleware/validator.js - Input Validation
// ============================================
// Validates all user inputs
// Protection against XSS and injection attacks

const { body, param, query, validationResult } = require('express-validator');

// ====== Validation Result Check ======
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ====== Register Validation ======
exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s-]{10,15}$/).withMessage('Please enter a valid phone number'),
  validate
];

// ====== Login Validation ======
exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// ====== QR Code Create Validation ======
exports.validateQRCreate = [
  body('category')
    .optional()
    .isIn(['child', 'car', 'vehicle', 'bag', 'pet', 'key', 'luggage', 'document', 'other'])
    .withMessage('Please select a valid category'),
  body('qrPassword')
    .notEmpty().withMessage('QR Password is required')
    .isLength({ min: 6 }).withMessage('QR Password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('QR Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('QR Password must contain at least one lowercase letter'),
  body('registeredName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .escape(),
  body('registeredEmail')
    .optional()
    .isEmail().withMessage('Please enter a valid email'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
    .escape(),
  validate
];

// ====== QR Activate (Form Submit) Validation ======
exports.validateQRActivate = [
  body('registeredName')
    .trim()
    .notEmpty().withMessage('Name is required')
    .escape(),
  body('registeredEmail')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('category')
    .notEmpty().withMessage('Select a category')
    .isIn(['child', 'car', 'vehicle', 'bag', 'pet', 'key', 'luggage', 'document', 'other']),
  body('qrPassword')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),
  validate
];

// ====== Scan Location Validation ======
exports.validateScanLocation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Please enter a valid latitude'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Please enter a valid longitude'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 }).withMessage('Accuracy must be greater than 0'),
  validate
];

// ====== Track Request Validation ======
exports.validateTrackRequest = [
  body('qrId')
    .trim()
    .notEmpty().withMessage('QR Code Number is required')
    .isLength({ min: 5, max: 30 }).withMessage('Please enter a valid QR Code Number'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// ====== MongoDB ID Validation ======
exports.validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  validate
];
