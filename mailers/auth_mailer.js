// Import the nodeMailer module and the dotenv configuration module
const nodeMailer = require('../config/nodemailer');
require('dotenv').config();

// Export a function that sends a password change alert email to the user
exports.passwordChangeAlertMail = (user) => {
    // Render the email content using a template and the user's details
    let mailContent = nodeMailer.renderTemplate(
        { user: user },
        '/auth/password_change_alert.ejs'
    );
    // Send the email using nodemailer's transporter object, including the email content and necessary details
    nodeMailer.transporter.sendMail(
        {
            name: 'Moonfy',
            from: '"Moonfy" <hachem03000@gmail.com>',
            to: user.email,
            subject: 'Password Change Alert',
            html: mailContent,
        },
        // Log any errors encountered during the process
        function (err, info) {
            if (err) {
                console.log('Error : ', err);
            }
            return;
        }
    );
};

// Export a function that sends a password reset link email to the user
exports.passwordResetLinkMail = (user) => {
    // Render the email content using a template and the user's details
    let mailContent = nodeMailer.renderTemplate(
        { user: user },
        '/auth/password_reset_link.ejs'
    );
    // Send the email using nodemailer's transporter object, including the email content and necessary details
    nodeMailer.transporter.sendMail(
        {
            from: '"Moonfy" <hachem03000@gmail.com>',
            to: user.email,
            subject: 'Password Reset Request',
            html: mailContent,
        },
        // Log any errors encountered during the process
        function (err, info) {
            if (err) {
                console.log('Error : ', err);
            }
            return;
        }
    );
};

// Export a function that sends an email verification link to the user
exports.emailVerificationMail = (user, verificationLink) => {
    // Render the email content using a template and the user's details
    let mailContent = nodeMailer.renderTemplate(
        { user: user, verificationLink: verificationLink },
        '/auth/email_verification.ejs'
    );
    // Send the email using nodemailer's transporter object, including the email content and necessary details
    nodeMailer.transporter.sendMail(
        {
            from: '"Moonfy" <hachem03000@gmail.com>',
            to: user.email,
            subject: 'Verify Your Email Address',
            html: mailContent,
        },
        // Log any errors encountered during the process
        function (err, info) {
            if (err) {
                console.log('Error sending verification email: ', err);
            } else {
                console.log('Verification email sent successfully to: ' + user.email);
            }
            return;
        }
    );
};
