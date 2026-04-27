const config = require('../config');

let twilioClient = null;

// Initialize Twilio only if credentials provided
if (config.twilio.sid && config.twilio.authToken) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(config.twilio.sid, config.twilio.authToken);
  } catch (err) {
    console.warn('Twilio initialization failed:', err.message);
  }
}

/**
 * Send SMS notification
 */
async function sendSMS(to, body) {
  if (!twilioClient) {
    console.log(`📱 [DEV] SMS to ${to}: ${body}`);
    return { success: true, dev: true };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: config.twilio.phone,
      to,
    });
    console.log(`📱 SMS sent to ${to}: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send task assignment SMS
 */
async function sendTaskAssignmentSMS(volunteer, need, task) {
  if (!volunteer.phone) {
    console.log('No phone number for volunteer, skipping SMS');
    return { success: false, error: 'No phone number' };
  }

  const deadline = task.deadline 
    ? ` Deadline: ${new Date(task.deadline).toLocaleDateString()}.` 
    : '';
  
  const body = `Urgent: ${need.category} in ${need.area_name}. ${need.num_people_affected} people affected.${deadline} Reply YES to accept.`;
  
  return sendSMS(volunteer.phone, body);
}

module.exports = {
  sendSMS,
  sendTaskAssignmentSMS,
};
