# AI-Powered Car Service Scheduler

A full-stack application for scheduling car service appointments with AI-powered voice assistant support.

## Features

- 📱 Voice-powered booking system with Hindi support
- 📊 Weekly bookings analytics
- 📅 Appointment scheduling
- 📱 Mobile-responsive UI
- 🤖 AI-powered voice assistant
- Exotel voice call handling
- Multi-language support

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/car-service-scheduler.git
   cd car-service-scheduler
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up speech-to-text models:
   ```bash
   # Create models directory
   mkdir -p models/deepspeech
   
   # Download DeepSpeech models
   curl -L https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm -o models/deepspeech/deepspeech-0.9.3-models.pbmm
   curl -L https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.scorer -o models/deepspeech/deepspeech-0.9.3-models.scorer
   ```

4. Create a `.env` file with the following variables:
   - EXOTEL_SID
   - EXOTEL_TOKEN
   - GOOGLE_CALENDAR_API_KEY
   - BASE_URL
   - PORT

5. Start the server:
   ```bash
   npm start
   ```

## Voice Flow

1. Callers receive a welcome message in Hindi
2. Option to choose language (Hindi/English)
3. Date selection for service
4. Time slot selection
5. Confirmation of booking

## API Endpoints

- POST /voice - Initial voice call handler
- POST /handle-voice-input - Language selection handler
- POST /handle-date - Date selection handler
- POST /handle-time - Time slot selection handler
- POST /confirm-booking - Booking confirmation handler

## Technologies Used

- Node.js
- Express
- Exotel API
- Google Calendar API
- Dialogflow (for AI interactions)
