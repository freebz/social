module.exports = {
    service: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    secureConnection: false,
    name: "servername",
    auth: {
	user: "myussername",
	pass: "mypassword"
    },
    ignoreTLS: false,
    debug: true,
    maxConnections: 5
}
