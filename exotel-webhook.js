const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const axios = require('axios');
const mongoose = require('mongoose');

// Initialize Google Cloud clients
const speechClient = new SpeechClient();
const textToSpeechClient = new TextToSpeechClient();

// Initialize Exotel client
const Exotel = require('exotel');
const exotel = new Exotel(process.env.EXOTEL_SID, process.env.EXOTEL_TOKEN);

// Create Express router
const router = express.Router();

// Webhook endpoint for incoming calls
router.post('/webhook', async (req, res) => {
  try {
    const { From, To, Status, CallSid } = req.body;

    // Log the incoming call
    console.log('Incoming call from:', From);

    // Initialize the call with a greeting
    const response = {
      dial: {
        number: To,
        action: '/webhook/process',
        method: 'POST'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook'
    });
  }
});

// Process incoming voice
router.post('/webhook/process', async (req, res) => {
  try {
    const { CallSid, Digits, SpeechResult } = req.body;
    
    // Log incoming request
    console.log('Incoming request:', {
      callSid: CallSid,
      digits: Digits,
      hasSpeech: !!SpeechResult
    });

    // Initialize error handling
    const handleError = (error, context) => {
      console.error('Voice processing error:', {
        error,
        context,
        callSid: CallSid
      });

      // Store error in database
      storeError(CallSid, error.message, context);

      // Send error message in Hindi
      res.json({
        speak: {
          text: 'Maaf kijiye, kuch technical problem ho gayi hai. Kripya phir se try karein.',
          language: 'hi-IN',
          action: '/webhook/process'
        }
      });
    };

    // If we have speech result, process it
    if (SpeechResult) {
      try {
        // Convert speech to text
        const text = await speechToText(SpeechResult);
        
        // Process the text with AI
        const aiResponse = await processAIResponse(text);
        
        // Convert AI response to speech
        const audio = await textToSpeech(aiResponse);
        
        // Store the interaction in database
        await storeInteraction(CallSid, text, aiResponse);
        
        // Send the response back to Exotel
        res.json({
          speak: {
            text: aiResponse,
            language: 'hi-IN',
            action: '/webhook/process'
          }
        });
      } catch (error) {
        handleError(error, 'speech-processing');
      }
    }
    // If we have DTMF input (digits pressed)
    else if (Digits) {
      try {
        // Process the digit input
        const response = await processDigitInput(Digits);
        
        // Send the response
        res.json({
          speak: {
            text: response,
            language: 'hi-IN',
            action: '/webhook/process'
          }
        });
      } catch (error) {
        handleError(error, 'digit-processing');
      }
    }
    // If it's the first interaction
    else {
      try {
        // Send initial greeting
        res.json({
          speak: {
            text: 'Namaste! Main aapka car service assistant hoon. Kya main aapki kisi tarah se help kar sakta hoon?',
            language: 'hi-IN',
            action: '/webhook/process'
          }
        });
      } catch (error) {
        handleError(error, 'initial-greeting');
      }
    }
  } catch (error) {
    console.error('Critical error in process:', error);
    res.status(500).json({
      error: 'Failed to process voice'
    });
  }
});

// Store error in database
async function storeError(callSid, errorMessage, context) {
  try {
    const error = new ErrorLog({
      callSid,
      errorMessage,
      context,
      timestamp: new Date()
    });

    await error.save();
  } catch (error) {
    console.error('Failed to store error:', error);
  }
}

// Speech to text conversion
async function speechToText(audio) {
  const request = {
    audio: {
      content: audio
    },
    config: {
      encoding: 'MP3',
      sampleRateHertz: 16000,
      languageCode: 'hi-IN',
      enableAutomaticPunctuation: true
    }
  };

  const [response] = await speechClient.recognize(request);
  return response.results[0].alternatives[0].transcript;
}

// Text to speech conversion
async function textToSpeech(text) {
  const request = {
    input: { text },
    voice: {
      languageCode: 'hi-IN',
      ssmlGender: 'NEUTRAL'
    },
    audioConfig: {
      audioEncoding: 'MP3'
    }
  };

  const [response] = await textToSpeechClient.synthesizeSpeech(request);
  return response.audioContent;
}

// Process AI response
async function processAIResponse(text) {
  try {
    // Here you would integrate with your AI model
    // For now, we'll use a simple mapping
    const responses = {
      'car service': 'Kya aap apni car ki service schedule karne chahte hain?',
      'yes': 'Aapka naam kya hai?',
      'no': 'Namaste! Koi aur help chahiye to humse contact karein.',
      'default': 'Maaf kijiye, main samajh nahi paaya. Kripya phir se batayein.'
    };

    // Get the appropriate response
    const response = responses[text.toLowerCase()] || responses.default;
    
    return response;
  } catch (error) {
    console.error('Error in AI response:', error);
    return 'Maaf kijiye, kuch technical problem ho gayi hai. Kripya phir se try karein.';
  }
}

// Process digit input
async function processDigitInput(digits) {
  try {
    // Map digits to time slots
    const timeSlots = {
      '1': 'कल 10 बजे',
      '2': 'कल 2 बजे',
      '3': 'कल 4 बजे',
      '4': 'पहले दिन 10 बजे',
      '5': 'पहले दिन 2 बजे',
      '6': 'पहले दिन 4 बजे'
    };

    // Get the selected time slot
    const selectedSlot = timeSlots[digits];
    
    // Create booking
    await createBooking(selectedSlot);
    
    return `Namaste! Aapka booking confirm ho gaya hai!\n\nAapka car service ${selectedSlot} ke liye book ho gaya hai.\n\nDhanyavaad!`;
  } catch (error) {
    console.error('Error in digit input:', error);
    return 'Maaf kijiye, kuch technical problem ho gayi hai. Kripya phir se try karein.';
  }
}

// Store interaction in database
async function storeInteraction(callSid, customerText, aiResponse) {
  try {
    // Create a new interaction document
    const interaction = new Interaction({
      callSid,
      customerText,
      aiResponse,
      timestamp: new Date()
    });

    // Save to database
    await interaction.save();
  } catch (error) {
    console.error('Error storing interaction:', error);
  }
}

// Create booking
async function createBooking(timeSlot) {
  try {
    // Create a new booking
    const booking = new Booking({
      status: 'pending',
      preferredTimeSlot: timeSlot,
      timestamp: new Date()
    });

    // Save to database
    await booking.save();
  } catch (error) {
    console.error('Error creating booking:', error);
  }
}

module.exports = router;
