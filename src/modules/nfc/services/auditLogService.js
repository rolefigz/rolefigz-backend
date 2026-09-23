const { AuditLog } = require("../../../models");

async function registraAzione({ actorUserId, companyId = null, action, details = null }, transaction = null) {
  return AuditLog.create(
    { actor_user_id: actorUserId, company_id: companyId, action, details },
    transaction ? { transaction } : {}
  );
}

module.exports = { registraAzione };
