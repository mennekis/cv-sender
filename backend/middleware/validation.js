/**
 * Middleware для валидации входных данных
 * Использует express-validator для централизованной валидации
 */

const { body, validationResult } = require("express-validator");
const constants = require("../config/constants");

/**
 * Middleware для обработки результатов валидации
 */
const handleValidationErrors = (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      return res.status(400).json({
         error: "Validation Error",
         message: "Invalid input data",
         details: errors.array(),
      });
   }
   next();
};

/**
 * Валидация для endpoint /send
 */
const validateSendEmail = [
   body("subject")
      .trim()
      .notEmpty()
      .withMessage("Subject is required")
      .isLength({ max: 200 })
      .withMessage("Subject must be less than 200 characters"),

   body("coverLetter")
      .trim()
      .notEmpty()
      .withMessage("Cover letter is required")
      .isLength({ min: 10, max: 10000 })
      .withMessage("Cover letter must be between 10 and 10000 characters"),

   body("senderName")
      .trim()
      .notEmpty()
      .withMessage("Sender name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Sender name must be between 2 and 100 characters")
      .matches(/^[a-zA-Zа-яА-ЯёЁ\s]+$/)
      .withMessage("Sender name can only contain letters and spaces"),

   body("clientEmail")
      .trim()
      .notEmpty()
      .withMessage("Client email is required")
      .isEmail()
      .withMessage("Client email must be a valid email address")
      .normalizeEmail(),

   body("contactPhone")
      .trim()
      .notEmpty()
      .withMessage("Contact phone is required")
      .isLength({ min: 5, max: 20 })
      .withMessage("Contact phone must be between 5 and 20 characters"),

   body("messengers")
      .optional()
      .custom((value) => {
         try {
            const messengers = JSON.parse(value || "[]");
            if (!Array.isArray(messengers)) {
               throw new Error("Messengers must be an array");
            }
            const allowed = ["viber", "whatsapp", "telegram"];
            const invalid = messengers.filter((m) => !allowed.includes(m));
            if (invalid.length > 0) {
               throw new Error(
                  `Invalid messengers: ${invalid.join(
                     ", "
                  )}. Allowed: ${allowed.join(", ")}`
               );
            }
            return true;
         } catch (e) {
            throw new Error(`Invalid messengers format: ${e.message}`);
         }
      }),

   handleValidationErrors,
];

/**
 * Валидация для endpoint /campaign/start
 */
const validateCampaignStart = [
   body("clientName")
      .trim()
      .notEmpty()
      .withMessage("Client name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Client name must be between 2 and 100 characters"),

   body("subject")
      .trim()
      .notEmpty()
      .withMessage("Subject is required")
      .isLength({ max: 200 })
      .withMessage("Subject must be less than 200 characters"),

   body("body")
      .trim()
      .notEmpty()
      .withMessage("Body is required")
      .isLength({ min: 10, max: 50000 })
      .withMessage("Body must be between 10 and 50000 characters"),

   handleValidationErrors,
];

/**
 * Валидация query параметров для /campaigns
 */
const validateCampaignsQuery = [
   (req, res, next) => {
      const limit =
         parseInt(req.query.limit) || constants.PAGINATION.DEFAULT_LIMIT;
      const skip =
         parseInt(req.query.skip) || constants.PAGINATION.DEFAULT_SKIP;

      if (limit < 1 || limit > constants.PAGINATION.MAX_LIMIT) {
         return res.status(400).json({
            error: "Validation Error",
            message: `Limit must be between 1 and ${constants.PAGINATION.MAX_LIMIT}`,
         });
      }

      if (skip < 0) {
         return res.status(400).json({
            error: "Validation Error",
            message: "Skip must be a non-negative number",
         });
      }

      if (
         req.query.status &&
         !Object.values(constants.CAMPAIGN_STATUS).includes(req.query.status)
      ) {
         return res.status(400).json({
            error: "Validation Error",
            message: `Invalid status. Allowed values: ${Object.values(
               constants.CAMPAIGN_STATUS
            ).join(", ")}`,
         });
      }

      req.query.limit = limit;
      req.query.skip = skip;
      next();
   },
];

module.exports = {
   validateSendEmail,
   validateCampaignStart,
   validateCampaignsQuery,
   handleValidationErrors,
};
