const Email = require('../models/Email');
const Client = require('../models/Client');
const { sendMail, generateEmailHTML } = require('../utils/emailService');

exports.getDashboard = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const query = { userId };
        if (req.query.search) {
            query.subject = { $regex: req.query.search, $options: 'i' };
        }
        if (req.query.clientId) {
            query.clientId = req.query.clientId;
        }

        const emails = await Email.find(query)
            .populate('clientId', 'name email company')
            .sort({ sentDate: -1 });

        const clients = await Client.find({ userId, isDeleted: false })
            .select('name email company')
            .sort({ name: 1 });

        // Calculate delivery stats
        const stats = {
            total: await Email.countDocuments({ userId }),
            delivered: await Email.countDocuments({ userId, deliveryStatus: 'delivered' }),
            failed: await Email.countDocuments({ userId, deliveryStatus: 'failed' }),
            sentThisMonth: await Email.countDocuments({
                userId,
                sentDate: { $gte: new Date(new Date().setDate(1)) }
            })
        };

        res.render('emails/index', {
            title: 'Emails',
            path: '/emails',
            emails,
            clients,
            stats,
            filters: req.query
        });
    } catch (error) {
        console.error('Error fetching emails:', error);
        next(error);
    }
};

exports.getDetail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const email = await Email.findOne({
            _id: req.params.id,
            userId
        }).populate('clientId', 'name email company phone');

        if (!email) {
            return res.redirect('/emails');
        }

        res.render('emails/detail', {
            title: 'Email Detail',
            path: '/emails',
            emailRecord: email
        });
    } catch (error) {
        console.error('Error fetching email details:', error);
        next(error);
    }
};

exports.sendEmail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { clientId, subject, message, emailType } = req.body;

        // Get the client's email address
        const client = await Client.findById(clientId);
        if (!client) {
            return res.redirect('/emails');
        }

        // Process attachments
        let dbAttachments = [];
        let mailAttachments = [];

        if (req.files && req.files.length > 0) {
            // Upload each file to Cloudinary via buffer stream (for DB storage)
            // and simultaneously prepare buffer-based nodemailer attachments (no HTTP fetch needed)
            const { cloudinary } = require('../middleware/upload');

            const uploadPromises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'client_workspace/emails', resource_type: 'auto' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve({ file, result });
                        }
                    );
                    stream.end(file.buffer);
                });
            });

            const uploaded = await Promise.all(uploadPromises);

            uploaded.forEach(({ file, result }) => {
                // For DB: store the Cloudinary URL
                dbAttachments.push({
                    filename: file.originalname,
                    url: result.secure_url,
                    size: file.size
                });
                // For nodemailer: pass the buffer directly (no HTTP request to Cloudinary)
                mailAttachments.push({
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                });
            });
        }

        // Generate HTML email body
        const htmlBody = generateEmailHTML(message, emailType || 'custom');

        // Attempt to send the real email via SMTP
        let deliveryStatus = 'failed';
        try {
            await sendMail({
                to: client.email,
                subject: subject,
                text: message, // Plain text fallback
                html: htmlBody,
                attachments: mailAttachments
            });
            deliveryStatus = 'delivered';
            console.log(`[INFO] Email sent to ${client.email}: "${subject}"`);
        } catch (smtpError) {
            console.error('[ERROR] SMTP send failed:', smtpError.message);
            deliveryStatus = 'failed';
        }

        // Save email record to DB regardless of delivery status
        const email = new Email({
            userId,
            clientId,
            subject,
            message,
            emailType: emailType || 'custom',
            attachments: dbAttachments,
            deliveryStatus,
            sentDate: new Date()
        });

        await email.save();

        // Create an activity log for the client's timeline
        const Activity = require('../models/Activity');
        const activity = new Activity({
            userId,
            clientId,
            type: 'email',
            description: `Sent Email: "${subject}"\n\n${message}`
        });
        await activity.save();

        res.redirect('/emails');
    } catch (error) {
        console.error('Error sending email:', error);
        next(error);
    }
};

