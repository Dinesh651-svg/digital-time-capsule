import test from "node:test";
import assert from "node:assert/strict";
import { sendRegistrationEmail } from "../services/emailService.js";

test("registration email is skipped when SMTP is not configured", async () => {
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_FROM;

  const result = await sendRegistrationEmail("user@example.com", "Test User");

  assert.deepEqual(result, { sent: false, reason: "not_configured" });
});
