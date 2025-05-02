// Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Please add your Mongo URI to environment variables');
    }
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Models
const Interaction = mongoose.model('Interaction', new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    unique: true
  },
  customerText: String,
  aiResponse: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}));

const ErrorLog = mongoose.model('ErrorLog', new mongoose.Schema({
  callSid: {
    type: String,
    required: true
  },
  errorMessage: {
    type: String,
    required: true
  },
  context: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
  clientId: String,
  name: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  carDetails: {
    make: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    registrationNumber: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      min: 1900,
      max: 2099
    }
  },
  preferredTimeSlot: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Import voice flow
const { textToSpeech, speechToText, processVoiceFlow } = require('./voice-flow');

// Conversation context
let conversationHistory = [];

// Initialize Google Cloud clients
const speechClient = new SpeechClient();

// Initialize Exotel
const Exotel = require('exotel');
const exotel = new Exotel(process.env.EXOTEL_SID, process.env.EXOTEL_TOKEN);

// Import Exotel webhook router
const exotelWebhook = require('./exotel-webhook');

// Use Exotel webhook routes
app.use('/exotel', exotelWebhook);

// Available time slots
const timeSlots = {
  '1': '9:00 AM - 10:00 AM',
  '2': '10:00 AM - 11:00 AM',
  '3': '11:00 AM - 12:00 PM',
  '4': '2:00 PM - 3:00 PM',
  '5': '3:00 PM - 4:00 PM',
  '6': '4:00 PM - 5:00 PM'
};

// API Routes

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { 
      name, 
      contactNumber, 
      carDetails, 
      preferredTimeSlot,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !contactNumber || !carDetails || !preferredTimeSlot) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Create new booking
    const booking = new Booking({
      name,
      contactNumber,
      carDetails,
      preferredTimeSlot,
      notes
    });

    // Save to database
    await booking.save();

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      error: 'Failed to create booking'
    });
  }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate('carDetails');

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
});

// Get a specific booking
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('carDetails');

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Failed to fetch booking'
    });
  }
});

// Update a booking
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Update fields
    Object.assign(booking, req.body);
    booking.updatedAt = new Date();

    // Save updates
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      error: 'Failed to update booking'
    });
  }
});

// Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Delete booking
    await booking.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      error: 'Failed to delete booking'
    });
  }
});

// Get bookings by status
app.get('/api/bookings/status/:status', async (req, res) => {
  try {
    const bookings = await Booking.find({ status: req.params.status })
      .sort({ createdAt: -1 })
      .populate('carDetails');

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings by status:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
});

// Get today's bookings
app.get('/api/bookings/today', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      preferredTimeSlot: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .sort({ preferredTimeSlot: 1 })
    .populate('carDetails');

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching today\'s bookings:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
});

// Confirm booking
app.put('/api/bookings/:id/confirm', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({
      error: 'Failed to confirm booking'
    });
  }
});

// Reschedule booking
app.put('/api/bookings/:id/reschedule', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Here you would typically add logic to update the time slot
    // For now, we'll just mark it as pending
    booking.status = 'pending';
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({
      error: 'Failed to reschedule booking'
    });
  }
});

// Cancel booking
app.put('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      error: 'Failed to cancel booking'
    });
  }
});

// Get weekly bookings statistics
app.get('/api/bookings/stats/weekly', async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    // Create an array of dates for the last 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekAgo);
      date.setDate(weekAgo.getDate() + i);
      dates.push(date);
    }

    // Get bookings count for each day
    const bookings = await Booking.aggregate([
      {
        $match: {
          preferredTimeSlot: {
            $gte: weekAgo,
            $lte: today
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$preferredTimeSlot"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create result array with all dates filled
    const result = dates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const booking = bookings.find(b => b._id === dateStr);
      return {
        date: dateStr,
        count: booking ? booking.count : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching weekly bookings stats:', error);
    res.status(500).json({
      error: 'Failed to fetch weekly bookings stats'
    });
  }
});

// Function to make outbound call
app.post('/make-call', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Make outbound call
    const call = await exotel.calls.create({
      From: process.env.EXOTEL_FROM_NUMBER,
      To: phoneNumber,
      CallerId: process.env.EXOTEL_FROM_NUMBER,
      Url: `${process.env.BASE_URL}/handle-call`
    });

    res.json({ success: true, callSid: call.CallSid });
  } catch (error) {
    console.error('Error making call:', error);
    res.status(500).json({ error: 'Failed to make call' });
  }
});

// Handle incoming call
app.post('/handle-incoming-call', async (req, res) => {
  try {
    const { From, To } = req.body;
    
    // Initialize conversation with caller's phone number
    conversationHistory = [{
      role: 'system',
      content: `You are a car service assistant. The caller's phone number is ${From}. Speak in Hindi. Be friendly and professional.`
    }];

    // Play initial greeting
    const response = {
      "Response": {
        "Say": {
          "Value": "Namaste! Apka car service ke liye humare seva center se swagat hai. Main aapki kaise help kar sakta hoon?",
          "Language": "hi-IN"
        },
        "Record": {
          "Action": "hangup",
          "Method": "POST",
          "Url": `${process.env.BASE_URL}/handle-voice-input`
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error handling incoming call:', error);
    res.status(500).json({ error: 'Failed to handle call' });
  }
});

// Handle voice input and process with GPT-4
app.post('/handle-voice-input', async (req, res) => {
  try {
    const { CallSid, From, To, RecordingUrl } = req.body;

    // Get audio recording from RecordingUrl
    const recording = await axios.get(RecordingUrl, { responseType: 'arraybuffer' });

    // Convert audio to text using Google Speech-to-Text
    const audioBytes = Buffer.from(recording.data);
    const audio = {
      content: audioBytes.toString('base64'),
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 8000,
      languageCode: 'hi-IN',
    };

    const [response] = await speechClient.recognize({ audio, config });
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // Add to conversation history
    conversationHistory.push({
      role: 'user',
      content: transcription
    });

    // Generate response using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 150
    });

    const aiResponse = completion.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    // Process booking if needed
    if (aiResponse.includes('booking confirmed')) {
      // Extract booking details from conversation
      const dateMatch = aiResponse.match(/(\d{2}[-/\s]\d{2}[-/\s]\d{4})/);
      const timeMatch = aiResponse.match(/(\d{2}:\d{2} [AP]M)/);
      const carModelMatch = aiResponse.match(/(car model:.*?)(?=,|$)/);
      const registrationMatch = aiResponse.match(/(registration:.*?)(?=,|$)/);

      if (dateMatch && timeMatch && carModelMatch && registrationMatch) {
        const date = new Date(dateMatch[1]);
        const timeSlot = timeMatch[1];
        const carDetails = {
          model: carModelMatch[1].replace('car model:', '').trim(),
          registration: registrationMatch[1].replace('registration:', '').trim()
        };

        // Create booking
        await createBooking(From, date, timeSlot, carDetails);
      }
    }

    // Convert text to speech
    const [audioResponse] = await textToSpeechClient.synthesizeSpeech({
      input: { text: aiResponse },
      voice: { 
        languageCode: 'hi-IN',
        ssmlGender: 'FEMALE'
      },
      audioConfig: { audioEncoding: 'MP3' }
    });

    // Save audio to file and get URL
    const audioUrl = await saveAudioToFile(audioResponse.audioContent);

    // Send response to caller
    const response = {
      "Response": {
        "Play": {
          "Url": audioUrl
        },
        "Record": {
          "Action": "hangup",
          "Method": "POST",
          "Url": `${process.env.BASE_URL}/handle-voice-input`
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error handling voice input:', error);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
});

// Handle voice input and process with GPT-4
app.post('/handle-voice-input', async (req, res) => {
  try {
    const { CallSid, From, To, RecordingUrl } = req.body;

    // Get audio recording from RecordingUrl
    const recording = await axios.get(RecordingUrl, { responseType: 'arraybuffer' });

    // Convert audio to text using Google Speech-to-Text
    const audioBytes = Buffer.from(recording.data);
    const audio = {
      content: audioBytes.toString('base64'),
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 8000,
      languageCode: 'hi-IN',
    };

    const [response] = await speechClient.recognize({ audio, config });
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // Add to conversation history
    conversationHistory.push({
      role: 'user',
      content: transcription
    });

    // Generate response using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 150
    });

    const aiResponse = completion.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    // Convert text to speech
    const [audioResponse] = await textToSpeechClient.synthesizeSpeech({
      input: { text: aiResponse },
      voice: { 
        languageCode: 'hi-IN',
        ssmlGender: 'FEMALE'
      },
      audioConfig: { audioEncoding: 'MP3' }
    });

    // Save audio to file and get URL
    const audioUrl = await saveAudioToFile(audioResponse.audioContent);

    // Send response to caller
    const response = {
      "Response": {
        "Play": {
          "Url": audioUrl
        },
        "GetDigits": {
          "FinishOnKey": "#",
          "CallbackUrl": `${process.env.BASE_URL}/handle-voice-input`
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error handling voice input:', error);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
});

// Helper function to save audio to file
async function saveAudioToFile(audioContent) {
  const fs = require('fs').promises;
  const path = require('path');
  const tempDir = path.join(__dirname, 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const fileName = `response_${Date.now()}.mp3`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, audioContent, 'base64');
  
  // Return URL accessible by the caller
  return `${process.env.BASE_URL}/audio/${fileName}`;
}

// Voice flow handlers
app.post('/voice', async (req, res) => {
  const { CallSid, From, To } = req.body;
  
  // Initialize voice response
  const response = {
    "Response": {
      "Say": {
        "Value": "Namaste! Apka car service ke liye humare seva center se swagat hai. Main aapki kaise help kar sakta hoon?"
      },
      "GetDigits": {
        "Say": {
          "Value": "Press 1 - Car service slot book karna hai\nPress 2 - Service ke bare mein janna hai\nPress 3 - Pehle se book ki hui slot check karna hai"
        },
        "FinishOnKey": "#",
        "CallbackUrl": `${process.env.BASE_URL}/handle-main-menu`
      }
    }
  };

  res.json(response);
});

app.post('/handle-main-menu', async (req, res) => {
  const { Digits } = req.body;
  
  switch (Digits) {
    case '1':
      // Book service
      const response = {
        "Response": {
          "Say": {
            "Value": "Aapke liye kis din seva slot book karna hai?\nPress 1 - Kal\nPress 2 - Pechle din\nPress 3 - Pehle se book ki hui slot check karna hai"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-date`
          }
        }
      };
      res.json(response);
      break;

    case '2':
      // Service information
      const infoResponse = {
        "Response": {
          "Say": {
            "Value": "Humare car service ke bare mein kya janna chahte hain?\nPress 1 - Service ki durations\nPress 2 - Service ki charges\nPress 3 - Service ke liye kya kya items zaroori hain"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-service-info`
          }
        }
      };
      res.json(infoResponse);
      break;

    case '3':
      // Check booking
      const checkResponse = {
        "Response": {
          "Say": {
            "Value": "Aapka booking number kya hai? Kripaya enter karein"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-booking-check`
          }
        }
      };
      res.json(checkResponse);
      break;

    default:
      const defaultResponse = {
        "Response": {
          "Say": {
            "Value": "Maaf karein, galat number press kiya gaya hai. Fir se try karein."
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-main-menu`
          }
        }
      };
      res.json(defaultResponse);
  }
});

app.post('/handle-date', async (req, res) => {
  const { Digits } = req.body;
  
  // Get available time slots based on date
  const availableSlots = Object.values(timeSlots).join(', ');
  
  const response = {
    "Response": {
      "Say": {
        "Value": `Aapke liye ye time slots available hain: ${availableSlots}\nPress 1 - 9:00 AM - 10:00 AM\nPress 2 - 10:00 AM - 11:00 AM\nPress 3 - 11:00 AM - 12:00 PM\nPress 4 - 2:00 PM - 3:00 PM\nPress 5 - 3:00 PM - 4:00 PM\nPress 6 - 4:00 PM - 5:00 PM`
      },
      "GetDigits": {
        "FinishOnKey": "#",
        "CallbackUrl": `${process.env.BASE_URL}/handle-time-slot`
      }
    }
  };

  res.json(response);
});

app.post('/handle-time-slot', async (req, res) => {
  const { Digits } = req.body;
  const selectedSlot = timeSlots[Digits];
  
  const response = {
    "Response": {
      "Say": {
        "Value": `Aapne ${selectedSlot} ka slot select kiya hai. Kya aapko ye slot confirm karna hai?\nPress 1 - Haan, confirm karna hai\nPress 2 - Nahi, fir se time select karna hai`
      },
      "GetDigits": {
        "FinishOnKey": "#",
        "CallbackUrl": `${process.env.BASE_URL}/handle-confirmation`
      }
    }
  };

  res.json(response);
});

app.post('/handle-confirmation', async (req, res) => {
  const { Digits } = req.body;
  
  if (Digits === '1') {
    const response = {
      "Response": {
        "Say": {
          "Value": "Dhanyawad! Aapka booking confirm ho gaya hai. Aapke mobile par booking details shortly send kiye jaenge. Kya aapko kuch aur help chahiye?\nPress 1 - Haan\nPress 2 - Nahi, thank you"
        }
      },
      "GetDigits": {
        "FinishOnKey": "#",
        "CallbackUrl": `${process.env.BASE_URL}/handle-final`
      }
    };
    res.json(response);
  } else {
    const response = {
      "Response": {
        "Say": {
          "Value": "Aapko kis time slot mein service chahiye? Fir se select karein"
        },
        "GetDigits": {
          "FinishOnKey": "#",
          "CallbackUrl": `${process.env.BASE_URL}/handle-time-slot`
        }
      };
    res.json(response);
  }
});

app.post('/handle-service-info', async (req, res) => {
  const { Digits } = req.body;
  
  switch (Digits) {
    case '1':
      const durationResponse = {
        "Response": {
          "Say": {
            "Value": "Car service ke liye average time 1 to 2 ghante lagaata hai. Heavy service ke liye time aur lagaata hai. Kya aapko aur kuch janna hai?\nPress 1 - Haan\nPress 2 - Nahi, maine service book karna hai"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-final`
          }
        }
      };
      res.json(durationResponse);
      break;

    case '2':
      const chargesResponse = {
        "Response": {
          "Say": {
            "Value": "Basic car service ka charge Rs. 1500 to 2000 ke beech hota hai. Heavy service ke liye charge aur hota hai. Kya aapko aur kuch janna hai?\nPress 1 - Haan\nPress 2 - Nahi, maine service book karna hai"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-final`
          }
        }
      };
      res.json(chargesResponse);
      break;

    case '3':
      const itemsResponse = {
        "Response": {
          "Say": {
            "Value": "Service ke liye aapko ye items laane honge:\n1. Car ki service book\n2. Car ki registration copy\n3. Car ki insurance copy\n4. Car ki keys\nKya aapko aur kuch janna hai?\nPress 1 - Haan\nPress 2 - Nahi, maine service book karna hai"
          },
          "GetDigits": {
            "FinishOnKey": "#",
            "CallbackUrl": `${process.env.BASE_URL}/handle-final`
          }
        }
      };
      res.json(itemsResponse);
      break;
  }
});

app.post('/handle-final', async (req, res) => {
  const { Digits } = req.body;
  
  if (Digits === '1') {
    const response = {
      "Response": {
        "Say": {
          "Value": "Main aapki kaise help kar sakta hoon? Press 1 - Service book karna hai\nPress 2 - Service ke bare mein janna hai"
        },
        "GetDigits": {
          "FinishOnKey": "#",
          "CallbackUrl": `${process.env.BASE_URL}/handle-main-menu`
        }
      }
    };
    res.json(response);
  } else {
    const response = {
      "Response": {
        "Say": {
          "Value": "Dhanyawad! Aapke seva center se swagat hai. Kripaya humare app ko 5 star rating dena."
        }
      }
    };
    res.json(response);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Add this comment to force a fresh deployment
// Add this comment to force a fresh deployment
