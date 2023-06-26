var express = require('express')
const axios = require('axios');
const multer = require('multer')

var app = express()
app.use(express.json());
const upload = multer({
    storage: multer.memoryStorage(),
    // dest: '/tmp',
    limits: { fileSize: 1024 * 1024 * 8 } // limit file size to 10 MB
});




const sendTranscriptToApi = async (transcript, auth, format) => {
    let formats = {
        sbar: "clinical note using the SBAR format (situation, background, assessment, recommendation). Leave sections blank if they are unknown. Use headers like 'Situation:' to indicate the sections. Do not use bullet points.",
        soap: "clinical note SOAP format (subjective, objective, assessment, plan).  Leave sections blank if they are unknown. Use headers like 'Subjective:' to indicate the sections. Do not use bullet points.",
        summary: "call summary",
    }
    let formatPhrase = formats[format | "sbar"]

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { "role": "system", "content": "You are a medical call-taker." }, {
                    "role": "user", "content": `
            Convert the following dialogue between a caller and a medical call-taker into a ${formatPhrase}.
            
            ${transcript}
            ` }]
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
    const url = 'https://api.openai.com/v1/audio/transcriptions';
    const blob = new Blob([file.buffer])

    try {
        const formData = new FormData();
        formData.append('model', 'whisper-1');
        formData.append('prompt', 'Okay. Thank you for that. And right now, are you experiencing any chest pain that gets worse when you taken a deep breath or when you cough? No, not at all.');
        formData.append('file', blob, file.originalname);

        const headers = {
            Authorization: auth
        };

        const response = await axios.post(url, formData, { headers });

        const output = {
            content: response.data.text
        }

        return output
    } catch (error) {
        console.error(error);
        return "error"
    }

}

const sendAudioFileToApiDA = async (file, auth) => {
    const url = 'https://api.openai.com/v1/audio/transcriptions';
    const blob = new Blob([file.buffer])

    try {
        const formData = new FormData();
        formData.append('model', 'whisper-1');
        formData.append('language', 'da');
        formData.append('prompt', 'Der er gået tre dage, og han har fortsat bund trods behandling med Panodil og Ipren, der suppleres med tramadol over weekenden. RP, tramadol, 50 mg max. 3 gange dagligt, opfølgning næste uge ved manglende effekter.');
        formData.append('file', blob, file.originalname);


        const headers = {
            Authorization: auth
        };

        const response = await axios.post(url, formData, { headers });

        const output = {
            content: response.data.text
        }

        return output
    } catch (error) {
        console.error(error);
        return "error"
    }

}


const getCodesFromApi = async (note, auth) => {

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [{
                "role": "user", "content": `Return a bullet point list of any related ICD-10 and SNOMED codes from this note:
            ${note}`
            }]
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
            messages: [{
                "role": "user", "content": `Convert the following facts about a patient into a short summary that a nurse might write. Use the SBAR format. Leave sections blank that do not reflect the facts below:
            ${note}`
            }]
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

const getMetadata = async (transcript, auth) => {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { "role": "system", "content": "You are an API that only returns JSON in response to requests." },
                {
                    "role": "user",
                    "content":
                        `Convert the transcript of a telephone dialogue between a caller and a medical call-taker into a structured JSON that looks like the following:
                    {
                        \"title\": \"title of the call (max 32 characters)\",
                        \"category\": \"Medical/Scheduling/Complaint/General Inquiry/Other\",
                        \"patient\": {
                            \"name\": {
                                \"given\": \"given name\",
                                \"family\": \"family name\",
                                \"text\": \"full name\",
                                \"alternate_name\": \"e.g. a nickname. If unknown, leave as null\",
                            },
                            \"gender\": \"Male/Female/Other/Unknown\",
                            \"birthDate\": \"YYYY-MM-DD\",
                        },
                        \"customer_service\": {
                            \"rating\": \"High/Medium/Low\",
                            \"comment\": \"short feedback to the call-taker on customer service\"
                        },
                        \"caller_difficulty\": {
                            \"rating\": \"High/Medium/Low\",
                            \"comment\": \"short description of how the caller was difficult (if medium or low)\"
                        }
                    }
                    
                    Transcript:
                    ${transcript}`
                }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = response.data.choices[0].message.content

        return JSON.parse(output)
    } catch (error) {
        console.error(error);
    }
}

const getClinicalNotesCodes = async (transcript, format, auth) => {
    let formats = {
        sbar: "clinical note using the SBAR format (situation, background, assessment, recommendation). Leave sections blank if they are unknown. Use headers like 'Situation:' to indicate the sections. Do not use bullet points.",
        soap: "clinical note SOAP format (subjective, objective, assessment, plan).  Leave sections blank if they are unknown. Use headers like 'Subjective:' to indicate the sections. Do not use bullet points.",
        summary: "call summary",
    }
    let formatPhrase = formats[format]
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { "role": "system", "content": "You are an API that only returns JSON in response to requests." },
                {
                    "role": "user",
                    "content":
                        `Convert the transcript of a telephone dialogue between a caller and a medical call-taker into a ${formatPhrase} and any relevant ICD-10 codes. Use the following JSON format:
                        {
                            \"situation\": \"concise statement of the patient's current condition\",
                            \"background\": \"pertinent and brief information related to the situation\",
                            \"assessment\": \"analysis and considerations of options — what the nurse found/thought\",
                            \"recommendation\": \"action requested/recommended - what the nurse wants to be done\",
                            \"ICD-10\": [
                                {\"code\": \"icd-10 code\", \"description\": \"name of ICD codes\"},
                            ],
                            \"actions\": [
                                {\"action_description\": \"action to be taken\", \"due_date\": \"YYYY-MM-DD\"}
                            ]
                        }
                    Transcript:
                    ${transcript}`
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = response.data.choices[0].message.content

        return JSON.parse(output)
    } catch (error) {
        console.error(error);
    }
}

const getNonClinicalSummary = async (transcript, auth) => {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { "role": "system", "content": "You are an API that only returns JSON in response to requests." },
                {
                    "role": "user",
                    "content":
                        `Summarise the transcript of the call between a patient and a medical call-taker, and extract a list of any actions that need to be taken. Use the following JSON format:
                    {
                        \"summary\": \"concise summary of the reason for the call and actions taken\",
                        \"actions\": [
                            {\"action_description\": \"action to be taken\", \"due_date\": \"YYYY-MM-DD\"}
                        ]
                    }
                    Transcript:
                    ${transcript}`
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });

        const output = response.data.choices[0].message.content

        return JSON.parse(output)
    } catch (error) {
        console.error(error);
    }
}

const handleDocumentCreation = async (file, auth) => {
    let note;
    let transcript = await sendAudioFileToApi(file, auth);
    if (transcript === "error") return "error";
    const meta = await getMetadata(transcript.content, auth);
    if (meta.category = "medical") {
        note = await getClinicalNotesCodes(transcript.content, auth);
        note.type = "Clinical Note"
    } else {
        note = await getNonClinicalSummary(transcript.content, auth);
        note.type = "Call Summary"
    }
    return {
        transcript,
        ...meta,
        note
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

app.post('/transcribe-da', upload.single('audio'), async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        let output = await sendAudioFileToApiDA(req.file, auth)
        return res.send(output)
    }
})

app.post('/document', upload.single('audio'), async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        let output = await handleDocumentCreation(req.file, auth)
        return res.send(output)
    }
})

app.post('/document-meta', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await getMetadata(req.body.transcript, auth)
        return res.send(output)
    }
})

app.post('/document-notes', async (req, res) => {
    if (!req.header("Authorization")) {
        return res.status(400).send('Missing Authorization: Bearer header');
    } else {
        let auth = req.header("Authorization")
        console.log(req.body)
        let output = await getNonClinicalSummary(req.body.transcript, auth)
        return res.send(output)
    }
})


app.listen(process.env.PORT || 3000)