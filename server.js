const express = require('express');
const https = require('https');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const CONSUMER_KEY = "YOUR_SAFARICOM_CONSUMER_KEY";
const CONSUMER_SECRET = "YOUR_SAFARICOM_CONSUMER_SECRET";
const SHORTCODE = "174379";
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const LIVE_URL = "https://onrender.com";

function makeHttpsPost(url, headers, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: headers
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', (err) => reject(err));
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function getMpesaToken() {
    const auth = Buffer.from(CONSUMER_KEY + ":" + CONSUMER_SECRET).toString('base64');
    return new Promise((resolve, reject) => {
        https.get('https://safaricom.co.ke', {
            headers: { Authorization: "Basic " + auth }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data).access_token));
        }).on('error', (err) => reject(err));
    });
}

async function triggerStkPush(phoneNumber, amount, accountRef) {
    const token = await getMpesaToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0') +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0');

    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    const payload = {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: LIVE_URL + "/mpesa-callback",
        AccountReference: accountRef,
        TransactionDesc: "Automated Package Purchase"
    };

    const headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
    };

    return makeHttpsPost('https://safaricom.co.ke', headers, payload);
}

app.post('/ussd', (req, res) => {
    const { text, phoneNumber } = req.body;
    let response = "";

    let formattedPhone = phoneNumber || "";
    if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.replace("+", "");
    if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);

    const levels = text ? text.split('*') : [];

    if (levels.length === 0 || text === "") {
        response = "CON Select Package Type:\n1. Data Bundles\n2. Voice Minutes\n3. SMS Packs";
    }
    else if (levels[0] === "1") {
        if (levels.length === 1) {
            response = "CON Select Data Bundle:\n1. 50MB (24HR) - KES 5\n2. 150MB (24HR) - KES 10\n3. 1GB (24HR) - KES 99";
        } else if (levels[1] === "1") {
            if (levels.length === 2) response = "CON Buy 50MB for KES 5?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 5, "50MBData").catch(err => console.error(err.message));
                response = "END Processing KES 5 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "2") {
            if (levels.length === 2) response = "CON Buy 150MB for KES 10?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 10, "150MBData").catch(err => console.error(err.message));
                response = "END Processing KES 10 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "3") {
            if (levels.length === 2) response = "CON Buy 1GB for KES 99?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 99, "1GBData").catch(err => console.error(err.message));
                response = "END Processing KES 99 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        }
    }
    else if (levels[0] === "2") {
        if (levels.length === 1) {
            response = "CON Select Minutes Package:\n1. 5 Mins (24HR) - KES 5\n2. 12 Mins (24HR) - KES 10\n3. 40 Mins (24HR) - KES 30";
        } else if (levels[1] === "1") {
            if (levels.length === 2) response = "CON Buy 5 Mins for KES 5?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 5, "5MinVoice").catch(err => console.error(err.message));
                response = "END Processing KES 5 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "2") {
            if (levels.length === 2) response = "CON Buy 12 Mins for KES 10?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 10, "12MinVoice").catch(err => console.error(err.message));
                response = "END Processing KES 10 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "3") {
            if (levels.length === 2) response = "CON Buy 40 Mins for KES 30?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 30, "40MinVoice").catch(err => console.error(err.message));
                response = "END Processing KES 30 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        }
    }
    else if (levels[0] === "3") {
        if (levels.length === 1) {
            response = "CON Select SMS Package:\n1. 20 SMS (24HR) - KES 5\n2. 50 SMS (24HR) - KES 10\n3. 200 SMS (24HR) - KES 20";
        } else if (levels[1] === "1") {
            if (levels.length === 2) response = "CON Buy 20 SMS for KES 5?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 5, "20SmsPack").catch(err => console.error(err.message));
                response = "END Processing KES 5 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "2") {
            if (levels.length === 2) response = "CON Buy 50 SMS for KES 10?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 10, "50SmsPack").catch(err => console.error(err.message));
                response = "END Processing KES 10 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        } else if (levels[1] === "3") {
            if (levels.length === 2) response = "CON Buy 200 SMS for KES 20?\n1. Confirm\n2. Cancel";
            else if (levels[2] === "1") {
                triggerStkPush(formattedPhone, 20, "200SmsPack").catch(err => console.error(err.message));
                response = "END Processing KES 20 payment. Check your phone for the M-Pesa PIN prompt.";
            }
        }
    } else {
        response = "END Session closed or selection invalid.";
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

app.post('/mpesa-callback', (req, res) => {
    const callbackData = req.body?.Body?.stkCallback;
    console.log("Incoming Callback Data Received!");

    if (callbackData && callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        console.log("Payment Successful! Kes " + amount + " from " + phone);
    } else {
        console.log("Payment dropped or failed.");
    }
    res.status(200).send("Callback Received");
});

app.get('/', (req, res) => res.send("Server is awake and fully responsive!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Termux server running cleanly on port " + PORT));
