const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

// Initialize transporter only if SMTP credentials are provided
if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Send an email notification
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    console.log(`   Body: ${text || html}`);
    return { success: true, dev: true };
  }

  try {
    const result = await transporter.sendMail({
      from: `"Community Aid Platform" <${config.smtp.user}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send task assignment email
 */
async function sendTaskAssignmentEmail(volunteer, need, task) {
  const acceptUrl = `${config.frontendUrl}/my-tasks?accept=${task.id}`;
  return sendEmail({
    to: volunteer.email,
    subject: `🚨 New Assignment: ${need.category} need in ${need.area_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">New Task Assignment</h2>
        <p>Hi ${volunteer.name},</p>
        <p>You have been matched to a community need:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Category:</strong> ${need.category}</p>
          <p><strong>Location:</strong> ${need.area_name}</p>
          <p><strong>People Affected:</strong> ${need.num_people_affected}</p>
          <p><strong>Urgency:</strong> ${Math.round(need.urgency_score * 100)}%</p>
          ${task.deadline ? `<p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}</p>` : ''}
        </div>
        <a href="${acceptUrl}" style="display: inline-block; background: #27ae60; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Accept Task</a>
        <p style="color: #666; margin-top: 16px; font-size: 12px;">
          If the button doesn't work, visit: ${acceptUrl}
        </p>
      </div>
    `,
    text: `New assignment: ${need.category} need in ${need.area_name}. ${need.num_people_affected} people affected. Accept: ${acceptUrl}`,
  });
}

/**
 * Send task completion notification to admin
 */
async function sendTaskCompletionEmail(adminEmail, volunteer, need) {
  return sendEmail({
    to: adminEmail,
    subject: `✅ Task Completed: ${need.category} in ${need.area_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Task Completed</h2>
        <p>Volunteer <strong>${volunteer.name}</strong> has completed the task:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Need:</strong> ${need.title}</p>
          <p><strong>Category:</strong> ${need.category}</p>
          <p><strong>Location:</strong> ${need.area_name}</p>
        </div>
      </div>
    `,
    text: `Task completed by ${volunteer.name}: ${need.title} in ${need.area_name}`,
  });
}

module.exports = {
  sendEmail,
  sendTaskAssignmentEmail,
  sendTaskCompletionEmail,
};
