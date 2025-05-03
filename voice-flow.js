const googleTTS = require('google-tts-api');
const { SpeechClient } = require('@google-cloud/speech');
const path = require('path');

// Initialize Speech-to-Text client with credentials
const speechClient = new SpeechClient({
  keyFilename: path.join(__dirname, 'google-credentials.json')
});

// Time slots in Hindi
const timeSlots = {
  '1': 'कल 10 बजे',
  '2': 'कल 2 बजे',
  '3': 'कल 4 बजे',
  '4': 'पहले दिन 10 बजे',
  '5': 'पहले दिन 2 बजे',
  '6': 'पहले दिन 4 बजे'
};

// Convert text to speech using google-tts-api
async function textToSpeech(text) {
  try {
    const audio = await googleTTS.speak(text, {
      lang: 'hi',
      slow: false,
      host: 'https://translate.google.com'
    });
    return audio;
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    throw error;
  }
}

// Convert speech to text using Google Cloud Speech-to-Text
async function speechToText(audio) {
  try {
    // Configure the audio encoding and other recognition parameters
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'hi-IN',
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
      model: 'command_and_search'
    };

    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const audioBytes = Buffer.from(audio, 'base64');

    const request = {
      config: config,
      audio: { content: audioBytes.toString('base64') },
      singleUtterance: true
    };

    // Detects speech in the audio file
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return transcription;
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    throw error;
  }
}

// Process voice flow
async function processVoiceFlow(callData) {
  try {
    // Get current state from call data
    const currentState = callData.state || 'greeting';
    
    switch (currentState) {
      case 'greeting':
        return {
          text: 'Namaste! Main aapka car service assistant hoon.\n\nKya aap apni car ki service schedule karne chahte hain?',
          state: 'ask-name'
        };

      case 'ask-name':
        return {
          text: 'Aapka naam kya hai?',
          state: 'ask-car-details'
        };

      case 'ask-car-details':
        return {
          text: 'Aapka car ka model aur registration number batayein?',
          state: 'ask-preferred-time'
        };

      case 'ask-preferred-time':
        return {
          text: 'Aapko kis samay ki service ki zarurat hai?\n\n1. Kal 10 बजे\n2. Kal 2 बजे\n3. Kal 4 बजे\n4. पहले दिन 10 बजे\n5. पहले दिन 2 बजे\n6. पहले दिन 4 बजे',
          state: 'confirm-booking'
        };

      case 'confirm-booking':
        // Get the selected time slot
        const selectedSlot = timeSlots[callData.digits];
        
        // Create booking
        await axios.post('/api/bookings', {
          name: callData.name,
          contactNumber: callData.contactNumber,
          carDetails: {
            model: callData.carModel,
            registrationNumber: callData.carRegistration
          },
          preferredTimeSlot: selectedSlot
        });

        return {
          text: `Namaste! Aapka booking confirm ho gaya hai!\n\nAapka car service ${selectedSlot} ke liye book ho gaya hai.\n\nDhanyavaad!`,
          state: 'end-call'
        };

      case 'end-call':
        return {
          text: 'Dhanyavaad! Koi aur help chahiye to humse contact karein.',
          state: 'completed'
        };

      default:
        return {
          text: 'Namaste! Kya main aapki kisi tarah se help kar sakta hoon?',
          state: 'greeting'
        };
    }
  } catch (error) {
    console.error('Error in voice flow:', error);
    return {
      text: 'Maaf kijiye, kuch technical problem ho gayi hai. Kripya phir se try karein.',
      state: 'error'
    };
  }
}

module.exports = {
  textToSpeech,
  speechToText,
  processVoiceFlow
};
