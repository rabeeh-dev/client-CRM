const User = require('../models/User');

exports.getSettings = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        res.render('settings/index', {
            title: 'Settings | Client Workspace',
            userRecord: user,
            activePage: 'settings'
        });
    } catch (err) {
        next(err);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        const {
            firstName, lastName, email,
            companyName, companyPhone, companyAddress, companyEmail,
            smtpSenderEmail,
            currency, timezone, dateFormat,
            currentPassword, newPassword
        } = req.body;

        // Profile
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;

        // Company
        if (!user.company) user.company = {};
        user.company.name = companyName || user.company.name;
        user.company.phone = companyPhone || user.company.phone;
        user.company.address = companyAddress || user.company.address;
        user.company.email = companyEmail || user.company.email;

        // SMTP
        if (!user.smtp) user.smtp = {};
        user.smtp.senderEmail = smtpSenderEmail || user.smtp.senderEmail;

        // Preferences
        if (!user.preferences) user.preferences = {};
        user.preferences.currency = currency || user.preferences.currency || 'INR';
        user.preferences.timezone = timezone || user.preferences.timezone || 'Asia/Kolkata';
        user.preferences.dateFormat = dateFormat || user.preferences.dateFormat || 'DD/MM/YYYY';

        // Password Update (if provided)
        if (newPassword && currentPassword) {
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }
            user.password = newPassword;
        }

        // Profile Photo & Company Logo Handling
        if (req.files) {
            const { cloudinary } = require('../middleware/upload');
            
            // Upload Profile Photo
            if (req.files.profilePhoto && req.files.profilePhoto.length > 0) {
                const pFile = req.files.profilePhoto[0];
                const pResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({ folder: 'client_workspace/avatars' }, (err, res) => {
                        if (err) reject(err); else resolve(res);
                    });
                    stream.end(pFile.buffer);
                });
                user.profileImage = pResult.secure_url;
            }

            // Upload Company Logo
            if (req.files.companyLogo && req.files.companyLogo.length > 0) {
                const cFile = req.files.companyLogo[0];
                const cResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({ folder: 'client_workspace/logos' }, (err, res) => {
                        if (err) reject(err); else resolve(res);
                    });
                    stream.end(cFile.buffer);
                });
                user.company.logo = cResult.secure_url;
            }
        }

        await user.save();
        
        // Update session user data
        if(req.session.user) {
            req.session.user.firstName = user.firstName;
            req.session.user.lastName = user.lastName;
            req.session.user.profileImage = user.profileImage;
        }
        
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        console.error('Settings Update Error:', err);
        res.status(500).json({ success: false, message: 'Server error updating settings' });
    }
};
