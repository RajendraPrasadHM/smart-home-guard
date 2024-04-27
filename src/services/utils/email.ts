import * as nodemailer from 'nodemailer';



const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "af9af39e7ebf49",
        pass: "597d6c6ad13fd0"
    }
});



export async function sendEmail(recipientEmail: string, subject: string, message: string) {
    try {
        // Send mail with defined transport object
        let info = await transport.sendMail({
            from: 'no-reply@smarthomeguard.com',
            to: recipientEmail,
            subject: subject,
            text: message
        });
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
