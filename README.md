# AI Video Interview Platform

A fully functional AI-driven video interview platform built with Next.js, TypeScript, and integrated with multiple AI services.

## 🚀 Features

- **Live Video Interviews** with ZEGOCLOUD
- **Real-time Transcription** using Deepgram
- **AI-Powered Analysis** with Gemini/OpenAI
- **Emotion Detection** using Face API.js
- **Automated Report Generation** with PDF export
- **Cloud Video Storage** with Cloudinary
- **Interview Analytics Dashboard**
- **Professional UI/UX** with TailwindCSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Video Calls**: ZEGOCLOUD SDK
- **Speech-to-Text**: Deepgram API
- **AI Services**: Google Gemini AI, OpenAI
- **Emotion Analysis**: Face API.js
- **File Storage**: Cloudinary
- **PDF Generation**: pdf-lib
- **Charts**: Chart.js, Recharts

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for:
  - ZEGOCLOUD (AppID + Server Secret)
  - Deepgram API
  - Google Gemini AI
  - OpenAI (optional)
  - Cloudinary

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-video-interview-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your API keys in `.env.local`**
   ```env
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # ZEGOCLOUD
   NEXT_PUBLIC_ZEGOCLOUD_APP_ID=your_zegocloud_app_id
   NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   
   # Deepgram
   DEEPGRAM_API_KEY=your_deepgram_api_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Getting API Keys

### ZEGOCLOUD
1. Sign up at [ZEGOCLOUD Console](https://console.zegocloud.com/)
2. Create a new project
3. Get your AppID and Server Secret from the project dashboard

### Deepgram
1. Sign up at [Deepgram](https://deepgram.com/)
2. Create a new project
3. Generate an API key from the project dashboard

### Google Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Copy the API key

### Cloudinary
1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Create an upload preset (optional, for unsigned uploads)

### OpenAI (Optional)
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Create an API key
3. Add billing information if needed

## 📁 Project Structure

```
/app
  /api
    /ai-response         # AI response generation
    /transcribe          # Deepgram transcription
    /tts                 # Text-to-speech
    /generate-report     # PDF report generation
  /interview
    page.tsx             # Interview page
  layout.tsx             # Root layout
  page.tsx              # Home page
  globals.css           # Global styles

/components
  Guidelines.tsx         # Pre-interview guidelines
  InterviewRoom.tsx     # Main interview interface
  InterviewTimer.tsx    # Interview timer
  EmotionAnalysis.tsx   # Emotion detection display
  EndInterviewModal.tsx # Post-interview modal

/lib
  deepgramClient.ts     # Deepgram SDK wrapper
  gemini.ts            # Gemini AI client
  faceProcessor.ts     # Face API emotion detection
  cloudinaryUpload.ts  # Cloudinary upload utilities
```

## 🎮 Usage

### For Candidates

1. **Visit the Interview Page**
   - Navigate to `/interview`
   - Review guidelines and technical requirements

2. **System Check**
   - Allow camera and microphone permissions
   - Complete system requirements check

3. **Start Interview**
   - Click "Start Interview" when ready
   - Answer questions naturally
   - Interview will be recorded and analyzed

4. **Complete Interview**
   - Interview ends automatically or manually
   - Review performance summary
   - Download PDF report

### For Recruiters

1. **Dashboard Access**
   - View candidate interviews
   - Review AI-generated reports
   - Filter by performance metrics

2. **Interview Analysis**
   - Detailed performance breakdown
   - Emotion analysis charts
   - Communication skills assessment
   - Hiring recommendations

## 🔧 Customization

### Interview Questions
Edit the questions array in `/components/InterviewRoom.tsx`:
```typescript
const [interviewQuestions] = useState([
  "Your custom question 1",
  "Your custom question 2",
  // Add more questions
])
```

### Emotion Detection
Modify emotion processing in `/lib/faceProcessor.ts`:
```typescript
const emotionMap: Record<string, string> = {
  neutral: 'calm',
  happy: 'confident',
  // Customize emotion mapping
}
```

### Report Template
Customize PDF report generation in `/app/api/generate-report/route.ts`

### 🎤 **Text-to-Speech Configuration**

The platform now uses **Google Cloud Text-to-Speech** (compatible with Gemini ecosystem) instead of OpenAI:

```bash
# Primary option - uses your existing Gemini API key
GEMINI_API_KEY=your_gemini_key_here

# Advanced option - dedicated Google Cloud TTS key (optional)
GOOGLE_CLOUD_API_KEY=your_google_cloud_key_here
```

**Voice Features:**
- **High-quality neural voices** (en-US-Neural2-F)
- **Professional female voice** optimized for interviews
- **Adjustable speech rate** (0.9x for clarity)
- **Fallback support** when API keys are missing

## 🔧 **Environment Configuration**

The app automatically reads API keys from `.env` and `.env.local` files. All APIs are properly configured to use environment variables.

### **📋 Quick Setup:**

1. **Check your environment:**
```bash
npm run check-env
```

2. **Test all APIs:**
```bash
npm run test-apis
```

3. **Start the application:**
```bash
npm run dev
```

### **🔑 Environment Variables Used:**

| Variable | Purpose | Status |
|----------|---------|--------|
| `GEMINI_API_KEY` | AI responses & scoring | ✅ Active |
| `DEEPGRAM_API_KEY` | Speech-to-text | ✅ Active |
| `ZEGOCLOUD_APP_ID` | Video calling | ✅ Active |
| `ZEGOCLOUD_SERVER_SECRET` | Video auth | ✅ Active |
| `CLOUDINARY_*` | File storage | ✅ Active |
| `OPENAI_API_KEY` | Alternative TTS | 🔧 Optional |
| `GOOGLE_CLOUD_API_KEY` | Enhanced TTS | 🔧 Optional |

### **📁 File Priority:**
1. `.env.local` (primary - for your actual keys)
2. `.env` (fallback - for default values)
3. System environment variables

### **🛡️ Security Notes:**
- `.env.local` is git-ignored (safe for real keys)
- `.env` should only contain example values
- Server-side APIs only - keys never exposed to browser

## 🚨 Troubleshooting

### Common Issues

1. **Camera/Microphone Not Working**
   - Ensure HTTPS (required for media permissions)
   - Check browser permissions
   - Verify device availability

2. **ZEGOCLOUD Connection Failed**
   - Verify AppID and Server Secret
   - Check network connectivity
   - Ensure domain is whitelisted

3. **Transcription Not Working**
   - Verify Deepgram API key
   - Check audio input levels
   - Ensure proper audio format

4. **AI Responses Failing**
   - Verify API keys (Gemini/OpenAI)
   - Check API usage limits
   - Monitor error logs

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

## 📊 Performance Optimization

### Video Compression
- Videos are automatically compressed via Cloudinary
- Adjust quality settings in `cloudinaryUpload.ts`

### Real-time Processing
- Emotion detection runs at 30fps
- Transcription uses streaming API
- Optimize based on hardware capabilities

## 🔒 Security & Privacy

- All media permissions are requested explicitly
- Video/audio data is encrypted in transit
- User data is processed according to privacy policies
- API keys are stored securely on server-side

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review API documentation

## 🎉 Acknowledgments

- ZEGOCLOUD for video calling infrastructure
- Deepgram for speech-to-text services
- Google for Gemini AI
- OpenAI for language models
- Cloudinary for media management
- Face API.js for emotion detection

---

Built with ❤️ using Next.js and TypeScript
