var express = require('express')
const axios = require('axios');
const multer  = require('multer')

var app = express()
app.use(express.json());
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 40 } // limit file size to 10 MB
  });




const sendTranscriptToApi = async (transcript, auth, format) => {
    let formats = {
        sbar: "SBAR format (situation, background, assessment, recommendation)",
        soap: "SOAP format (subjective, objective, assessment, plan)",
    }
    let formatPhrase = formats[format]

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": `Convert the following dialogue from a patient consultation into a short medical note, with a section covering the patient details, with the remaining using the ${formatPhrase}. Only mention things known from the text. If there isn't sufficient information for a section, just leave it blank: ${transcript}` }]
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
        const url = 'https://api.openai.com/v1/audio/transcriptions'; // replace with your API endpoint
    
        console.log("hi friends", url)

        const formData = new FormData();
        console.log("checkpoint 1")
        formData.append('audio', file.buffer, { filename: file.originalname });
        console.log("checkpoint 2")
        formData.append('model', 'whisper-1');
        console.log("checkpoint 3")
        formData.append('prompt', 'Okay. Thank you for that. And right now, are you experiencing any chest pain that gets worse when you taken a deep breath or when you cough?');
    
        console.log("checkpoint 4")
        const headers = {
          Authorization: auth
        };
    
        console.log("checkpoint 5")
        console.log(formData)
        const response = await axios.post(url, formData, { headers });
        console.log("checkpoint 6")
        console.log(response)
    
        const output = {
            content: response.data.text
        }
        console.log(output)
        return output

      } catch (error) {
        return error
      }

}


const getCodesFromApi = async (note, auth) => {

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
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
            model: "gpt-4",
            messages: [{ "role": "user", "content": `Convert the following facts about a patient into a short summary that a nurse might write. Use the SOAP format. Leave sections blank that do not reflect the facts below: ${note}` }]
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

app.post('/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        let output = await sendAudioFileToApi(req.file, auth)
        return res.send(output)
    }
})
app.listen(process.env.PORT || 3000)
