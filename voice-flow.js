const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const path = require('path');
const axios = require('axios');

// Initialize Speech-to-Text client with credentials
let speechClient;
let textToSpeechClient;

try {
  // Handle credentials based on environment
  let credentials;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Try to parse as JSON
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch (error) {
      console.warn('Error parsing Google credentials as JSON, using as path');
      // If not valid JSON, use as path to credentials file
      credentials = { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS };
    }
  } else {
    console.warn('No Google credentials found, using default authentication');
    credentials = {};
  }

  // Initialize clients
  speechClient = new SpeechClient(credentials);
  textToSpeechClient = new TextToSpeechClient(credentials);
} catch (error) {
  console.error('Error initializing Google Cloud clients:', error);
  // Create dummy clients for development/testing
  speechClient = {
    recognize: () => Promise.resolve([[{ results: [{ alternatives: [{ transcript: 'Test transcript' }] }] }]])
  };
  textToSpeechClient = {
    synthesizeSpeech: () => Promise.resolve([{ audioContent: Buffer.from('Test audio content') }])
  };
}

// Time slots in Hindi
const timeSlots = {
  '1': 'कल 10 बजे',
  '2': 'कल 2 बजे',
  '3': 'कल 4 बजे',
  '4': 'पहले दिन 10 बजे',
  '5': 'पहले दिन 2 बजे',
  '6': 'पहले दिन 4 बजे'
};

// Convert text to speech using Google Cloud Text-to-Speech
async function textToSpeech(text) {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input');
    }

    const request = {
      input: { text },
      voice: { languageCode: 'hi-IN', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' }
    };

    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    if (!response || !response.audioContent) {
      throw new Error('No audio content generated');
    }

    return response.audioContent;
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    throw new Error('Failed to convert text to speech');
  }
}

// Convert speech to text using Google Cloud Speech-to-Text
async function speechToText(audio) {
  try {
    // Validate input
    if (!audio || typeof audio !== 'string') {
      throw new Error('Invalid audio input');
    }

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
    throw new Error('Failed to convert speech to text');
  }
}

// Process voice flow
async function processVoiceFlow(callData) {
  try {
    // Validate input
    if (!callData || typeof callData !== 'object') {
      throw new Error('Invalid call data');
    }

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
        
        // Validate time slot selection
        if (!selectedSlot) {
          throw new Error('Invalid time slot selected');
        }

        // Create booking
        try {
          await axios.post(`${process.env.BASE_URL}/api/bookings`, {
            name: callData.name,
            contactNumber: callData.contactNumber,
            carDetails: {
              model: callData.carModel,
              registrationNumber: callData.carRegistration
            },
            preferredTimeSlot: selectedSlot
          });
        } catch (error) {
          console.error('Error creating booking:', error);
          throw new Error('Failed to create booking');
        }

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
