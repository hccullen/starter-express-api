import axios from 'axios';
import express from 'express'
const app = express()

const sendTranscriptToApi = async (transcript, auth, format) => {

    let formats = {
        sbar: "SBAR format (situation, background, assessment, recommendation)",
        soap: "SOAP format (subjective, objective, assessment, plan)",
    }
    let formatPhrase = formats[format]

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{"role": "user", "content": `Convert the following dialogue from a patient consultation into a short medical note, with a section covering the patient details, with the remaining using the ${formatPhrase}: ${transcript}`}]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = {
            transcript: transcript,
            data: response.data
        }

        return output
    } catch (error) {
        console.error(error);
    }
}


app.post('/summarize', (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        let output = sendTranscriptToApi(req.body.transcript, auth, req.body.format)
        return res.send(output)
    }  
})
app.listen(process.env.PORT || 3000)
