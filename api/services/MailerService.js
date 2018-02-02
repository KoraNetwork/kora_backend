const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(sails.config.sendgridApiKey);

function sendEmail ({to, subject, html}) {
  const msg = {
    to: to,
    from: 'kora@no-reply.com',
    subject: subject || 'Sample subject',
    html: html || '<h1>sample html</h1>'
  };
  return sgMail.send(msg);
}

function sendConfirmationEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Kora email confirmation instructions',
    html: `<p>To confirm your email click the <a href="${sails.config.HOST}/api/profile/confirmEmail/${user.emailVerificationToken}">link</a></p>`
  });
}

function sendResetPwEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'You have requested password restoration at Kora',
    html: `<p>Please, follow the <a href="${sails.config.HOST}/${user.resetPasswordToken}">link</a> to restore your password</p>`
  })
}

const mailer = {
  sendConfirmationEmail,
  sendResetPwEmail
};

module.exports = mailer;
