const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter (nodemailer v6 compatible)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certs (needed in some envs)
    }
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.warn('[WARN] SMTP connection failed:', error.message);
    } else {
        console.log('[INFO] SMTP connection verified successfully');
    }
});

/**
 * Send an email to a client
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @param {Array}  options.attachments - Array of attachment objects
 * @returns {Promise} - Nodemailer send result
 */
async function sendMail({ to, subject, text, html, attachments = [] }) {
    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Client Workspace'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
        attachments
    };

    return transporter.sendMail(mailOptions);
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(messageBody, emailType = 'custom') {
    const typeLabels = {
        contract:      { label: 'Client Contract', color: '#6366f1' },
        invoice:       { label: 'Invoice',          color: '#10b981' },
        proposal:      { label: 'Project Proposal', color: '#f59e0b' },
        update:        { label: 'Project Update',   color: '#3b82f6' },
        welcome_guide: { label: 'Welcome Guide',    color: '#0ea5e9' },
        final_note:    { label: 'Final Note',       color: '#ef4444' },
        custom:        { label: 'Message',          color: '#8b5cf6' }
    };

    const typeInfo = typeLabels[emailType] || typeLabels.custom;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; }
            .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .email-header { background: ${typeInfo.color}; padding: 30px 40px; text-align: center; }
            .email-header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
            .email-header .type-badge { display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .email-body { padding: 40px; color: #333; line-height: 1.7; font-size: 15px; }
            .email-body p { margin: 0 0 16px 0; }
            .email-footer { background: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef; }
            .email-footer p { color: #999; font-size: 12px; margin: 0; }
            .email-footer a { color: ${typeInfo.color}; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-header">
                <div class="type-badge">${typeInfo.label}</div>
                <h1>Client Workspace</h1>
            </div>
            <div class="email-body">
                ${messageBody.replace(/\n/g, '<br>')}
            </div>
            <div class="email-footer">
                <p>Sent via <a href="#">Client Workspace</a> — Your Freelancer Operating System</p>
            </div>
        </div>
    </body>
    </html>`;
}

module.exports = { sendMail, generateEmailHTML };
