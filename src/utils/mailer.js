// src/utils/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail", // or use SMTP config for production
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"VerifyMe" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
};
