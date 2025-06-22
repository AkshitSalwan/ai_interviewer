const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

if(!recognition) {
    console.error("Speech Recognition API is not supported in this browser.");
}
recognition.continuous = false;
recognition.interimResults = false;
recognition.maxAlternatives = 1;

recognition.onstart=()=>{
    console.log("Speech recognition started");
}
recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("Speech recognized: ", transcript);
    const result = await callGemini(transcript)
	const text=result.candidates[0].content.parts[0].text
    console.log(text)
  scrib.show(result)
  await TTS(text)
}
async function callGemini(text){
    const API_KEY=''; 
    const body = {
	  "system_instruction": {
      "parts": [
        {
          "text": "Your name is Dara.You are an AI Interviewer designed to conduct structured, professional interviews with job candidates. Your role is to ask insightful, role-specific questions, evaluate candidate responses, and provide objective feedback.Your interview process should follow these guidelines:1. Greet the candidate professionally and explain the interview structure.2. Begin with 1–2 warm-up questions (e.g., self-introduction, general background).3. Ask 4–6 role-specific technical questions based on the job title or field provided (e.g., frontend developer, data analyst, marketing executive).4. Ask 1–2 behavioral or situational questions to assess soft skills.5. Use follow-up questions if an answer is vague or incomplete.6. Transcribe and summarize key points from each answer for feedback.7. Maintain a friendly, encouraging, and unbiased tone.8. At the end, thank the candidate and provide a short summary of their performance: strengths, areas for improvement, and a confidence score (1–10).9. Do not make hiring decisions—only evaluate and summarize.Additional Behavior:Avoid repetition.Maintain a conversational pace.Keep questions concise and clear.Adapt to the candidate’s level of expertise."
        }
      ]
    },

    contents: [
            {
                parts: [
                    { text }
                ]
            }
        ]
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'},
            body: JSON.stringify(body)
    });

    const result=await response.json();
    return result;
}

// async function tts(text){
//   const OPENAI_API_KEY=''
//     const response = fetch('https://api.openai.com/v1/audio/speech', {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${OPENAI_API_KEY}`,
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             "model": "gpt-4o-mini-tts",
//             "input": text,
//             "voice": "onyx",
//             "instructions": "Speak in a assertive and positive tone.",
//             "response_format": "mp3"
//         })
//     });
//   const audioBlob = await response.blob();
//   const url=URL.createObjectURL(audioBlob)
  
//   const audio=document.getElementById('audio')
//   audio.src=url
//   audio.play()
// }
  
async function TTS(text) {
  const GOOGLE_CLOUD_API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY';

  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Wavenet-F',
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      }
    })
  });
  const data = await response.json();

  if (data.audioContent) {
    const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
    audio.play();
  } else {
    console.error("TTS API error:", data);
  }
}
recognition.start();
