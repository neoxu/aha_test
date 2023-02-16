db = require('./db');
const url = require('url');
const format = require('util').format;
const nodeMailer = require('nodemailer');
const randomString = require("randomstring");
const cryptoJS = require("crypto-js");

const TABLE_ACCOUNT = 'account';

const QUERY_SELECT_ONE = 'SELECT * FROM account where %s = "%s";';
const QUERY_FIELD_EXIST = 'SELECT EXISTS (SELECT * FROM account where %s = "%s") as RESULT;';
const QUERY_INSERT_ACCOUNT = 'INSERT INTO account (email, password, validated) VALUES (\'%s\', \'%s\', %d)';
const QUERY_UPDATE_VALIDATED = 'UPDATE account SET validated = 1 WHERE %s = "%s";';
const QUERY_UPDATE_PASSWORD = 'UPDATE account SET password = "%s" WHERE %s = "%s";';
const QUERY_UPDATE_NAME = 'UPDATE account SET name = "%s" WHERE %s = "%s";';

const WebPage = {
	INDEX: 'index',
	LOGIN: 'login',
	SIGNUP: 'signup',
	EMAIL_CONFIRM: 'email-confirm',
	CHANGE_PASSWORD: 'change-password',
	FORGOT_PASSWORD: 'forgot-password',
	RESET_PASSWORD: 'reset-password',
	MY_ACCOUNT: 'my-account',
}

const AccountField = {
	EMAIL: 'email',
	PASSWORD: 'password',
}

const hostName = 'localhost:15000';
const validateCode = '20230216';
const validateSubtitle = 'AHA exam from Neo';
const validateEmail = '<p>For validate your email, please click the link below:</p><p>Validate code %s</p><p>http://%s/email-confirm?email=%s&code=%s</p><br><b>Neo Hsu</b>';

// create reusable transporter object using the default SMTP transport
const mailTransport = nodeMailer.createTransport('SMTP', {
	service: 'Gmail',
	auth: {
		user: 'neoxuisme@gmail.com',
		pass: 'agtplfvhfnulfmei'
	}
});

// setup e-mail data with unicode symbols
const mailOptions = {
	from: '"Neo Hsu" <NiceMarketGames-gm-no-reply@nicemarket.com.tw>', // sender address
	to: '', // list of receivers
	cc: 'neoxuisme@gmail.com',
	subject: '', // Subject line
	text: '', // plaintext body
	html: '' // html body
};

function dbQuery(query, callback) {
	try
	{
		console.log(query);
		db.connect.query(query, function (err, results, fields) {
			if (err)
				callback(err);
			else
				callback(err, results);
		});
	} catch (e) {
		console.log('dbQuery exception: ' + e);
		callback(e);
	}
}

function UTCDate() {
	let now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
		now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));
}

function checkError(err, res, page) {
	if (!err)
		return true;
	else {
		if (res) {
			const clientObj = {title: page, RecMessage: err};

			if (res.req && res.req.session)
				clientObj.member = res.req.session.member;

			res.render(page, clientObj);
		}

		return false;
	}
}

function checkMember(member, res, page) {
	if (member != null)
		return true;
	else {
        responseClient(res, page, 'Account not found.');
		return false;
	}
}

function responseClient(res, page, msg) {
    if (!page)
        page = WebPage.INDEX;

    if (msg == null)
        msg = '';

	let clientObj = {title: page, RecMessage: msg};
    if (res.req && res.req.session) {
		clientObj.member = res.req.session.member;
	}

    res.render(page, clientObj);
}

function relogin(msg, res) {
	responseClient(res, WebPage.LOGIN, msg);
}

function validatePassword(password) {
	return true;
}

function parseURL(url, data) {
	let ps = url.split('?');
	if (ps.length == 2) {
		let foos = ps[1].split('&');
		if (foos && foos.length == 2) {
			let email = foos[0].split('=');
			let code = foos[1].split('=');
			if (email != null && email.length == 2 && code != null && code.length == 2 && email[0] == 'email' && code[0] == 'code') {
				data.email = email[1];
				data.code = code[1];
				return true;
			}
		}
	}

	return false;
}

exports.index = function(req, res) {
	if (req.session.member)
    	responseClient(res, WebPage.MY_ACCOUNT);
	else
		responseClient(res, WebPage.SIGNUP);
}

exports.login = function(req, res) {
	if (req.body.email && req.body.password) {
		let query = format(QUERY_SELECT_ONE, AccountField.EMAIL, req.body.email);

		dbQuery(query, function(err, result) {
			if (checkError(err, res, WebPage.LOGIN) && result && result.length > 0) {
				let member = result[0];

				if (member.password == req.body.password) {
                    if (member.validated) {
                        req.session.member = member;
                        responseClient(res, WebPage.MY_ACCOUNT);
                    } else { //Resend validation email.
						let clientObj = {
							title: WebPage.LOGIN,
							validated: req.body.email,
							RecMessage: 'Please validate Email.'
						};
						if (res.req && res.req.session)
							clientObj.member = res.req.session.member;

						res.render(WebPage.LOGIN, clientObj);
					}
				} else
					relogin('Password error.', res);
			}
		});
	} else
		relogin('Please confirm Email and password you entered.', res);
}

exports.signUp = function(req, res) {
	if (req.body.email && req.body.password) {
		if (req.body.password == req.body.confirm) {
			if (validatePassword(req.body.password)) {
				let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.body.email);

				dbQuery(query, function (err, result) {
					if (checkError(err, res, WebPage.SIGNUP)) {
						if (result != null && result.length > 0 && !result[0].RESULT) {
							let query2 = format(QUERY_INSERT_ACCOUNT, req.body.email, req.body.password, 0);

							dbQuery(query2, function (err, result2) {
								if (checkError(err, res, WebPage.LOGIN)) {
                                    mailOptions.to = req.body.email;
                                    mailOptions.subject = validateSubtitle;
                                    mailOptions.html = format(validateEmail, validateCode, hostName, req.body.email, validateCode);

                                    // send mail with defined transport object
                                    mailTransport.sendMail(mailOptions, function (err, info) {
                                        if (checkError(err, res, WebPage.SIGNUP))
                                            responseClient(res, WebPage.EMAIL_CONFIRM, req.body.email);
                                    });
								}
							});
						} else
                            responseClient(res, WebPage.SIGNUP, 'This email has been used.');
					}
				});
			} else
                responseClient(res, WebPage.SIGNUP, 'Length of password have to longer than 5.');
		} else
            responseClient(res, WebPage.SIGNUP, 'Please confirm password.');
	} else
        responseClient(res, WebPage.SIGNUP);
}

exports.emailConfirm = function(req, res) {
    try {
		let email = req.body.email;
		let code = req.body.code;

		if (!email || !code) {
			let urlData = {};

			if (parseURL(req.url, urlData)) {
				email = urlData.email;
				code = urlData.code;
			}
		}

		if (email && code == validateCode) {
			let query = format(QUERY_SELECT_ONE, AccountField.EMAIL, email);

			dbQuery(query, function(err, result) {
				if (checkError(err, res, WebPage.EMAIL_CONFIRM) && result != null) {
					let query = format(QUERY_UPDATE_VALIDATED, AccountField.EMAIL, email);

					dbQuery(query, function(err, result) {
						if (checkError(err, res, WebPage.EMAIL_CONFIRM)) {
							let member = {email: email};
							req.session.member = member;
							responseClient(res, WebPage.MY_ACCOUNT);
						}
					});
				}
			});
		} else
            responseClient(res, WebPage.EMAIL_CONFIRM, 'Please check email and verification code.');
    } catch (e) {
        console.log('EMailConfirm exception: ' + e);
		responseClient(res, WebPage.EMAIL_CONFIRM, 'EMailConfirm exception: ' + e);
    }
}

exports.resendValidation = function(req, res) {
	if (req.body.email) {
		let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.body.email);

		dbQuery(query, function (err, result) {
			if (checkError(err, res, WebPage.LOGIN)) {
				if (result != null && result.length > 0 && result[0].RESULT) {
					mailOptions.to = req.body.email;
					mailOptions.subject = validateSubtitle;
					mailOptions.html = format(validateEmail, validateCode, hostName, req.body.email, validateCode);

					// send mail with defined transport object
					mailTransport.sendMail(mailOptions, function (err, info) {
						if (checkError(err, res, WebPage.LOGIN))
							responseClient(res, WebPage.EMAIL_CONFIRM, req.body.email);
					});
				}
			}
		});
	} else
		responseClient(res, WebPage.LOGIN, 'Please check email.');
}

exports.resetPassword = function(req, res) {
	if (req.body.oldPassword && req.body.newPassword && req.body.confirm) {
		if (req.session.member.password == req.body.oldPassword) {
			if (req.body.newPassword != req.body.oldPassword) {
				if (req.body.newPassword == req.body.confirm) {
					if (validatePassword(req.body.newPassword)) {
						if (req.session.member) {
							if (req.session.member.email) {
								let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.session.member.email);

								dbQuery(query, function (err, result) {
									if (checkError(err, res, WebPage.MY_ACCOUNT)) {
										if (result != null && result.length > 0 && result[0].RESULT) {
											let query2 = format(QUERY_UPDATE_PASSWORD, req.body.newPassword, AccountField.EMAIL, req.session.member.email);
											dbQuery(query2, function (err, result2) {
												if (checkError(err, res, WebPage.MY_ACCOUNT)) {
													responseClient(res, WebPage.MY_ACCOUNT, 'Reset password success.');
													req.session.member.password = req.body.newPassword;
												} else
													responseClient(res, WebPage.MY_ACCOUNT, err);
											});
										} else
											responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
									}
								});
							} else
								responseClient(res, WebPage.MY_ACCOUNT, 'Please login by Email.');
						} else
							responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
					} else
						responseClient(res, WebPage.MY_ACCOUNT, 'Please validate password.');
				} else
					responseClient(res, WebPage.MY_ACCOUNT, 'Please confirm new password.');
			} else
				responseClient(res, WebPage.MY_ACCOUNT, 'New password can not the same old password.');
		} else
			responseClient(res, WebPage.MY_ACCOUNT, 'Please check old password.');
	}
}

exports.updateProfile = function(req, res) {
	if (req.body.name) {
		if (req.session.member) {
			if (req.session.member.email) {
				let query = format(QUERY_FIELD_EXIST, AccountField.EMAIL, req.session.member.email);

				dbQuery(query, function (err, result) {
					if (checkError(err, res, WebPage.MY_ACCOUNT)) {
						if (result != null && result.length > 0 && result[0].RESULT) {
							let query2 = format(QUERY_UPDATE_NAME, req.body.name, AccountField.EMAIL, req.session.member.email);
							dbQuery(query2, function (err, result2) {
								if (checkError(err, res, WebPage.MY_ACCOUNT)) {
									responseClient(res, WebPage.MY_ACCOUNT, 'Update profile success.');
								} else
									responseClient(res, WebPage.MY_ACCOUNT, err);
							});
						} else
							responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
					}
				});
			} else
				responseClient(res, WebPage.MY_ACCOUNT, 'Please login by Email.');
		} else
			responseClient(res, WebPage.MY_ACCOUNT, 'Please login first.');
	} else
		responseClient(res, WebPage.MY_ACCOUNT, 'Please check name.');
}

exports.logout = function(req, res) {
	if (req.session.member)
		delete req.session.member;

	relogin('', res);
}