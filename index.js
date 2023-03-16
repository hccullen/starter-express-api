var express = require('express')
const axios = require('axios');
const fileUpload = require('express-fileupload');

var app = express()
app.use(express.json())
app.use(fileUpload());




const sendTranscriptToApi = async (transcript, auth, format) => {
    let formats = {
        sbar: "SBAR format (situation, background, assessment, recommendation)",
        soap: "SOAP format (subjective, objective, assessment, plan)",
    }
    let formatPhrase = formats[format]

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": `Convert the following dialogue from a patient consultation into a short medical note, with a section covering the patient details, with the remaining using the ${formatPhrase}. Only state things known from the text. If there isn't sufficient information for a section, just leave it blank: ${transcript}` }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = {
            format: format,
            content: response.data.choices[0].message.content
        }

        return output
    } catch (error) {
        console.error(error);
    }
}

const sendAudioFileToApi = async (file, auth) => {

    try {
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', {
            file: file,
            model: "whisper-1",
            prompt: "Okay. Thank you for that. And right now, are you experiencing any chest pain that gets worse when you taken a deep breath or when you cough?"
        }, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${auth}`
            }
        });

        const output = {
            content: response.data.text
        }

        return output
    } catch (error) {
        console.error(error);
    }
}


const getCodesFromApi = async (note, auth) => {

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": `Return a bullet point list of any related ICD-10 and SNOMED codes from this note: ${note}` }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = {
            content: response.data.choices[0].message.content
        }

        return output
    } catch (error) {
        console.error(error);
    }
}


const getTriageSummary = async (note, auth) => {

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": `Convert the following facts about a patient into a short summary that a nurse might write. Use the SOAP format: ${note}` }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });
        
        console.log(`Convert the following questions and answers about a patient into a short summary that a nurse might write. Use the SOAP format: ${note}`)

        const output = {
            content: response.data.choices[0].message.content
        }

        return output
    } catch (error) {
        console.error(error);
    }
}


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

app.post('/summarize', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await sendTranscriptToApi(req.body.transcript, auth, req.body.format)
        return res.send(output)
    }
})

app.post('/summarize-nal', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await getTriageSummary(req.body.note, auth)
        return res.send(output)
    }
})

app.post('/code', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await getCodesFromApi(req.body.note, auth)
        return res.send(output)
    }
})

app.post('/transcribe', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await sendAudioFileToApi(req.files.audio, auth)
        return res.send(output)
    }
})
app.listen(process.env.PORT || 3000)
