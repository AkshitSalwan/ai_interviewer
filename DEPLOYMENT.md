# Deployment Guide

## 🚀 Quick Start

Your AI Video Interview Platform is now ready to run! Here's how to get started:

## 🏃‍♂️ Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3001`

2. **Set up your API keys**
   - Copy `.env.example` to `.env.local`  
   - Fill in your API keys (see setup guide below)

## 🔑 API Keys Setup Guide

### Required APIs (Get these first!)

1. **Google Gemini AI** (Free tier available)
   - Go to [Google AI Studio](https://makersuite.google.com/)
   - Create API key
   - Add to `GEMINI_API_KEY`

2. **Deepgram** (Free $200 credit)
   - Sign up at [Deepgram](https://deepgram.com/)
   - Get API key from dashboard
   - Add to `DEEPGRAM_API_KEY`

3. **ZEGOCLOUD** (Free tier: 10,000 minutes/month)
   - Sign up at [ZEGOCLOUD](https://console.zegocloud.com/)
   - Create project → Get AppID & Server Secret
   - Add to `NEXT_PUBLIC_ZEGOCLOUD_APP_ID` and `NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET`

4. **Cloudinary** (Free tier: 25GB storage)
   - Sign up at [Cloudinary](https://cloudinary.com/)
   - Get Cloud Name, API Key, API Secret from dashboard
   - Add to Cloudinary variables

### Optional APIs

5. **OpenAI** (Optional - for TTS)
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Add to `OPENAI_API_KEY`

## 📱 Test the Application

1. **Open** `http://localhost:3001`
2. **Click** "Start Interview"  
3. **Allow** camera/microphone permissions
4. **Complete** system check
5. **Begin** your AI interview!

## 🔧 Basic Configuration

### Interview Questions
Edit questions in `/components/InterviewRoom.tsx`:
```typescript
const [interviewQuestions] = useState([
  "Tell me about yourself",
  "What are your strengths?", 
  // Add your questions here
])
```

### Styling
- Colors: Edit `/tailwind.config.js`
- Global styles: Edit `/app/globals.css`
- Components: Modify individual component files

## 🌐 Production Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
- **Netlify**: Similar to Vercel
- **Railway**: Great for full-stack apps  
- **DigitalOcean**: App Platform
- **AWS**: Amplify or EC2

## 🚨 Troubleshooting

### Common Issues

**1. Camera/Mic not working**
- Use HTTPS (required for media access)
- Check browser permissions
- Try different browser

**2. "Failed to fetch" errors**
- Check API keys are correct
- Verify network connection
- Check browser console for details

**3. Video call not connecting**
- Verify ZEGOCLOUD credentials
- Check firewall settings
- Ensure domains are whitelisted

**4. Build errors**
- Run `npm install` again
- Clear Next.js cache: `rm -rf .next`
- Check Node.js version (use 18+)

### Debug Mode
Add to `.env.local`:
```env
DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

## 📊 Features Overview

✅ **Ready to Use:**
- Home page with feature showcase
- Interview preparation guidelines
- System requirements check
- Live video interview interface
- Real-time emotion analysis display
- Interview timer and controls
- End interview modal with summary
- PDF report generation
- AI response system
- Transcription interface

🔧 **Needs API Keys:**
- ZEGOCLOUD video calls
- Deepgram transcription  
- Gemini AI responses
- Cloudinary video storage
- Face API emotion detection

## 🎯 Next Steps

1. **Get API keys** (start with free tiers)
2. **Test locally** with mock data
3. **Customize questions** for your needs
4. **Style to match** your brand
5. **Deploy to production**
6. **Add user authentication** (optional)
7. **Build admin dashboard** (optional)

## 💡 Tips

- Start with Gemini AI (free & easy setup)
- Test video calls with 2 browser tabs
- Use browser dev tools to debug issues
- Check network tab for API call errors
- Monitor console for JavaScript errors

## 📞 Need Help?

- Check the main README.md for detailed docs
- Look at component files for examples
- Use browser dev tools for debugging
- Create GitHub issues for bugs

**🎉 You're all set! Time to conduct some AI interviews!**
