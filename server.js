const express = require('express');
const app = express();
app.use(express.json());

// This is your CallBackURL endpoint
app.post('/mpesa-callback', (req, res) => {
    const callbackData = req.body.Body.stkCallback;
    console.log("Incoming Callback Data Received!");

    if (callbackData.ResultCode === 0) {
        const metadata = callbackData.CallbackMetadata.Item;
        const amount = metadata.find(item => item.Name === 'Amount').Value;
        const phone = metadata.find(item => item.Name === 'PhoneNumber').Value;
        
        console.log(`Payment Successful! Kes ${amount} from ${phone}`);
        
        // TODO: Call your Airtime/Bundle Provider API here to send the data
    } else {
        console.log(`Payment failed: ${callbackData.ResultDesc}`);
    }
    res.status(200).send("Callback Received");
});

app.listen(3000, () => console.log('Termux server running on port 3000'));

