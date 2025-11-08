const nodemailer = require("nodemailer");

// Get email configuration from environment variables
const supportEmail = process.env.SUPPORT_EMAIL;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

// Create reusable transporter object using SMTP transport
let transporter = null;

if (emailUser && emailPassword) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

// POST /v1/support/request-club - Send club creation request email
const requestClubCreation = async (req, res, next) => {
  try {
    const {name, email, message} = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      const error = new Error("Name is required");
      error.status = 400;
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error("Email is required");
      error.status = 400;
      throw error;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.status = 400;
      throw error;
    }

    if (!message || !message.trim()) {
      const error = new Error("Message is required");
      error.status = 400;
      throw error;
    }

    // Check if email is configured
    if (!transporter) {
      console.error("Email not configured. Missing EMAIL_USER or EMAIL_PASSWORD");
      const error = new Error("Email service is not configured");
      error.status = 500;
      throw error;
    }

    if (!supportEmail) {
      console.error("Support email not configured. Missing SUPPORT_EMAIL");
      const error = new Error("Support email is not configured");
      error.status = 500;
      throw error;
    }

    // Prepare email content
    const mailOptions = {
      from: `Conscious Book Club <${emailUser}>`,
      to: supportEmail,
      subject: `New Club Creation Request from ${name}`,
      text: `
New club creation request received:

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from the Conscious Book Club app.
      `,
      html: `
<h2>New Club Creation Request</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, "<br>")}</p>
<hr>
<p><em>This email was sent from the Conscious Book Club app.</em></p>
      `,
      replyTo: email,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Club creation request submitted successfully",
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  requestClubCreation,
};

